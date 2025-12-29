import { useState, useEffect } from 'react'
import { configApi, llmApi } from '../services'
import { cib500px } from '@coreui/icons'
import { sleep } from '../utils/tools'
import { parseEvaluation } from '../utils/parser'

const TEST_MODEL_OPTIONS = {
  model: 'fireworks/qwen3-coder-480b-a35b-instruct',
  temperature: 1,
  top_p: 1,
}
const JUDGE_MODEL = {
  model: 'fireworks/qwen3-coder-480b-a35b-instruct',
  temperature: 0,
  top_p: 0,
}

const useLLM = () => {
  const [llmConfig, setLlmConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [modelResponses, setModelResponses] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [judgeTextResponses, setJudgeTextResponses] = useState([])
  const [judgeParseResponses, setJudgeParsedResponses] = useState([])
  const [attempts, setAttempts] = useState(0)
  const [wins, setWins] = useState(0)

  // Fetch LLM configuration from backend on hook initialization
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await configApi.getActive()
        const config = response.data
        setLlmConfig(config)
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
      } finally {
        setConfigLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const addManualResponse = async (prompt, response, validatedJson) => {
    setModelResponses(prev => [response, ...prev])
    await evaluate(validatedJson, prompt, response)
  }

  const runTestModel = async (prompt, criteria) => {
    if (!prompt.trim()) {
      setSubmitMessage('Please provide a prompt')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      console.log('Calling LLM with: \n', prompt)

      // Call the LLM using the backend API
      const response = await llmApi.generateResponse(prompt, TEST_MODEL_OPTIONS)
      const llmResponse = response.data.response

      setSubmitMessage(`LLM Response: ${llmResponse}`)
      setModelResponses((responses) => {
        return [...responses, llmResponse]
      })
      const res = await evaluate(criteria, prompt, llmResponse)
      return res
    } catch (error) {
      console.error('LLM call failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const evaluate = async (validatedJson, prompt, llmResponse) => {
    if (!validatedJson) {
      setSubmitMessage('Please provide valid JSON criteria array')
      return
    }

    if (!llmResponse) {
      setSubmitMessage('Please call the model first to generate a response')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('Starting evaluation...')

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

[Explanation]: All criteria satisfied. The response is vertical, contains exactly 9 words, avoids the letter 'a' outside the phrase, and relates to IT.

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

      console.log(`Judge evaluation `, {
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

      // Call the LLM using the backend API with messages
      const response = await llmApi.generateResponseWithMessages(messages, JUDGE_MODEL)
      console.log("llm rsponse", response)
      const judgeResponse = response.data.response
      setJudgeTextResponses(r => [...r, judgeResponse])
      const e = parseEvaluation(judgeResponse)
      console.log("extracted", e)
      setJudgeParsedResponses(r => [...r, e])
      return e.score == 0

    } catch (error) {
      console.error('Judge evaluation failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
    return null
  }

  const batch = async (prompt, criteria, maxTry = 10, goal = 4) => {
    setAttempts(0)
    setWins(0)
    let localWin = 0
    let localAttempts = 0
    console.log("run batch", maxTry, goal)
    while (localAttempts < maxTry && localWin < goal) {
      try {
        const res = await runTestModel(prompt, criteria)
        localAttempts++
        if (res) {
          localWin++
        }
        setAttempts((prev) => prev++)
        await sleep(500)
      } catch (e) {
        await sleep(500)
      }
    }
  }

  return {
    // State
    llmConfig,
    configLoading,
    modelResponses,
    judgeParseResponses,
    judgeTextResponses,
    wins,
    attempts,
    isSubmitting,
    submitMessage,


    // Actions
    setSubmitMessage,
    batch,
    addManualResponse,
  }
}

export default useLLM
