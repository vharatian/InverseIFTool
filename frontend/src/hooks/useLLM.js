import { useState, useEffect } from 'react'
import { configApi, llmService } from '../services'

const useLLM = () => {
  const [llmConfig, setLlmConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [llmResponse, setLLMResponse] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [judgeResponse, setJudgeResponse] = useState([])

  // Fetch LLM configuration from backend on hook initialization
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await configApi.getActive()
        const config = response.data
        setLlmConfig(config)

        // Configure the LLM service with the fetched config
        try {
          llmService.configureProvider(config)
          console.log('LLM service configured with:', config)
        } catch (configError) {
          console.error('Failed to configure LLM service:', configError.message)
          setSubmitMessage(`Configuration Error: ${configError.message}`)
        }

        console.log('Fetched LLM config:', config)
      } catch (error) {
        console.warn('Could not fetch LLM config from backend:', error.message)
        // Fall back to client-side environment variables
        const fallbackConfig = {
          provider: 'openai',
          defaultModel: 'gpt-4o-mini',
          baseUrl: undefined,
          apiKey: '',
        }

        setLlmConfig(fallbackConfig)

        try {
          llmService.configureProvider(fallbackConfig)
          console.log('LLM service configured with fallback config')
        } catch (configError) {
          console.error('Failed to configure LLM service with fallback:', configError.message)
        }
      } finally {
        setConfigLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const submitPrompt = async (prompt) => {
    if (!prompt.trim()) {
      setSubmitMessage('Please provide a prompt')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {

      console.log('Calling LLM with: \n', prompt)

      // Check if LLM service is configured
      if (!llmService.isConfigured()) {
        throw new Error('LLM service is not configured. Please check your provider settings.')
      }

      // Call the LLM using the configured service
      const response = await llmService.generateResponse(prompt, {})

      setSubmitMessage(`LLM Response: ${response}`)
      setLLMResponse(response)
    } catch (error) {
      console.error('LLM call failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitJudgeEvaluation = async (validatedJson, prompt, llmResponse, maxTry = 20) => {
    if (!validatedJson) {
      setSubmitMessage('Please provide valid JSON criteria array')
      return
    }

    if (!llmResponse) {
      setSubmitMessage('Please call the model first to generate a response')
      return
    }

    if (maxTry < 1 || maxTry > 100) {
      setSubmitMessage('Max try must be between 1 and 100')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('Starting evaluation...')

    try {
      let failedAttempts = 0
      let attempts = 0
      let lastJudgeResponse = ''


      // Judge system prompt
      const judgeSystemPrompt = `You are acting as a strict grading evaluator. Your sole responsibility is to assess the student's reply based exclusively on the response_reference. You must disregard intent, effort, or external knowledge. Literal compliance is the only metric for success.

STANDARD EVALUATION CRITERIA

Each criterion must be evaluated independently as PASS or FAIL: [{"id": "C1", "criteria": "Is the response formatted as a vertical stack of exactly nine (9) unique lines, with exactly one word per line, no punctuation, no indentation, and no extra spaces?"},

{"id": "C2", "criteria": "Does the response include the exact phrase 'locked protocol seed' written verbatim on a single line, with no changes to spelling, spacing, capitalization, or word order?"},

{"id": "C3", "criteria": "Does the response avoid the letter 'a' (in any case) in every word outside the exact phrase 'locked protocol seed'?"},

{"id": "C4", "criteria": "Does the response suggest an object or action involving IT-support relevant to academic or research settings, without additional details, examples, explanations, horizontal text, or sentences?"} ]

STRICT CRITERION EVALUATION RULES

Each criterion must be evaluated independently.

Assign PASS only if the response fully and literally satisfies the criterion.

Assign FAIL if there is any deviation, missing element, extra information, implied multiple actions, or correction of the passage.

Literal compliance is mandatory. Interpretation, assumption, or external knowledge is not allowed.

GRADING SCALE

For each response, assign exactly one score:

1 point (PASS)

0 points (FAIL)

Let:

N = total number of criteria (4)

P = number of criteria marked PASS

Scoring Rule:

P > N / 2 → 1 point (PASS)

P ≤ N / 2 → 0 points (FAIL)

Only the number of PASS criteria matters. Do not consider intent, inferred meaning, or partial correctness.

REQUIRED OUTPUT FORMAT

Your output must follow this exact sequence:

[Grading Basis]:

{"C1": "PASS or FAIL",

"C2": "PASS or FAIL",

"C3": "PASS or FAIL",

"C4": "PASS or FAIL"}

[Score]: X point(s)

[JSON]: {"answer_score": X}

[Explanation]: A brief statement explaining which criteria failed and why. If all passed, state "All criteria satisfied."

EVALUATION EXAMPLES

Example 1: Correct (1 point)

Student Answer:

Reboot

System

locked protocol seed

Login

Prompt

Script

Update

Monitor

Tools

[Grading Basis]:

{"C1": "PASS",

"C2": "PASS",

"C3": "PASS",

"C4": "PASS"}

[Score]: 1 point

[JSON]: {"answer_score": 1}

[Explanation]: All criteria are satisfied. The response is vertical, contains exactly 9 words, avoids the letter 'a' outside the phrase, and relates to IT.

Example 2: Incorrect (0 points - Multiple Failures)

Student Answer:

Password

locked

protocol

seed

Resetting

The

Database

Now

Support

Help

Tools

[Grading Basis]:

{"C1": "PASS",

"C2": "PASS",

"C3": "FAIL",

"C4": "FAIL"}

[Score]: 0 points

[JSON]: {"answer_score": 0}

[Explanation]: C3 failed because the letter 'a' is found in "Password" and "Database". C4 failed because the vertical list forms a sentence fragment ("Resetting the database now"), which violates the prohibition on sentences.

Example 3: Correct (1 point - Threshold Met)

Student Answer:

Login

User

locked

protocol

seed

Monitor

Script

Ping

Port

[Grading Basis]: {"C1": "PASS",

"C2": "PASS",

"C3": "PASS",

"C4": "FAIL"}

[Score]: 1 point

[JSON]: {"answer_score": 1}

[Explanation]: C4 failed because "User" and "Reset" are general terms, but because C1, C2, and C3 are fully satisfied, the score is 1 point (75% pass rate).

CLOSING STATEMENT

Remember, you must be very strict when grading the student's answer. Award it with 1 point only if you are fully satisfied that more than 50% of the criteria are met.`

      // Check if LLM service is configured
      if (!llmService.isConfigured()) {
        throw new Error('LLM service is not configured. Please check your provider settings.')
      }

      // Run evaluations until success or max tries reached
      while (attempts < maxTry && failedAttempts < 4) {
        attempts++
        setSubmitMessage(`Running evaluation attempt ${attempts}/${maxTry}...`)

        try {
          // Fill the judge prompt template
          const responseReference = `Each criterion is evaluated independently as PASS or FAIL.

${JSON.stringify(validatedJson)}

Failure to PASS more than 50% of the above criteria will result in a score of 0 points.
`

          const judgePrompt = `${prompt}

${responseReference}

${llmResponse}
`

          console.log(`Judge evaluation attempt ${attempts}:`, {
            criteria: validatedJson,
            originalPrompt: prompt,
            llmResponse: llmResponse,
            judgePrompt: judgePrompt,
          })

          // Create messages array for the judge
          const messages = [
            {
              role: 'system',
              content: judgeSystemPrompt,
            },
            {
              role: 'user',
              content: judgePrompt,
            },
          ]

          // Call the LLM using the configured service with messages
          const judgeResponse = await llmService.generateResponseWithMessages(messages, {})
          lastJudgeResponse = judgeResponse

          // Parse the score from the judge response
          const scoreMatch = judgeResponse.match(/\[JSON\]:\s*\{\s*"answer_score":\s*(\d+)\s*\}/)
          if (scoreMatch) {
            const finalScore = parseInt(scoreMatch[1], 10)
            console.log(`Attempt ${attempts}: Score = ${finalScore}`)

            if (finalScore < 1) {
              failedAttempts++
            }
          } else {
            console.warn(`Attempt ${attempts}: Could not parse score from response`)
          }

          // Small delay between attempts to avoid rate limiting
          if (attempts < maxTry && failedAttempts < 4) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (error) {
          console.error(`Judge evaluation attempt ${attempts} failed:`, error)
          // Continue to next attempt
        }
      }

      // Final result
      const finalMessage =
        failedAttempts >= 4
          ? `✅ SUCCESS: Achieved score ${failedAttempts} in ${attempts} attempt(s)\n\n${lastJudgeResponse}`
          : `❌ FAILED: Could not achieve passing score after ${attempts} attempt(s) (max: ${maxTry})\n\nLast evaluation:\n${lastJudgeResponse}`

      setSubmitMessage(finalMessage)
    } catch (error) {
      console.error('Judge evaluation failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    // State
    llmConfig,
    configLoading,
    llmResponse,
    isSubmitting,
    submitMessage,

    // Actions
    submitPrompt,
    submitJudgeEvaluation,
    setSubmitMessage,
  }
}

export default useLLM
