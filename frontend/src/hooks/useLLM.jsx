import { useState, useEffect } from 'react'
import { configApi, llmApi } from '../services'
import { cib500px } from '@coreui/icons'
import { sleep } from '../utils/tools'
import { parseEvaluation } from '../utils/parser'

/**
 * Default options for test model generation (creative, varied responses)
 * @constant {Object}
 */
const TEST_MODEL_OPTIONS = {
  temperature: 1,
  top_p: 1,
}

/**
 * Default options for judge model evaluation (consistent, deterministic responses)
 * @constant {Object}
 */
const JUDGE_MODEL = {
  temperature: 1,
  // top_p: 0,
}

/**
 * Custom hook for LLM operations including model testing, evaluation, and batch processing
 * Manages state for LLM configurations, responses, and evaluation results
 * @returns {Object} Hook interface with state and actions
 */
const useLLM = () => {
  // State management
  /** @type {LLMProviderConfig[]} Array of available LLM provider configurations */
  const [llmConfigs, setLlmConfigs] = useState([])
  /** @type {boolean} Whether LLM configurations are still loading */
  const [configLoading, setConfigLoading] = useState(true)
  /** @type {Array<{id: string, content: string}>} Array of model response objects with IDs */
  const [modelResponses, setModelResponses] = useState([])
  /** @type {boolean} Whether a submission is currently in progress */
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** @type {string} Current status message for user feedback */
  const [submitMessage, setSubmitMessage] = useState('')
  /** @type {Array<{id: string, content: string}>} Raw text responses from judge evaluations with IDs */
  const [judgeTextResponses, setJudgeTextResponses] = useState([])
  /** @type {Array<{id: string, gradingBasis: Object, score: number}>} Parsed evaluation results from judge responses with IDs */
  const [judgeParseResponses, setJudgeParsedResponses] = useState([])
  /** @type {number} Total number of attempts made in batch operations */
  const [attempts, setAttempts] = useState(0)
  /** @type {number} Number of successful evaluations (wins) */
  const [wins, setWins] = useState(0)
  /** @type {AbortController|null} Controller for cancelling ongoing operations */
  const [abortController, setAbortController] = useState(null)

  // Fetch LLM configurations from backend on hook initialization
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await configApi.getAll()
        const configs = response.data
        setLlmConfigs(configs)
        console.log('Fetched LLM configs:', configs)
      } catch (error) {
        console.warn('Could not fetch LLM configs from backend:', error.message)
        // Fall back to client-side environment variables
        const fallbackConfigs = [{
          provider: 'openai',
          defaultModel: 'gpt-4o-mini',
          models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
          isActive: true,
        }]
        setLlmConfigs(fallbackConfigs)
        setConfigLoading(false)
        setAvailableModels(['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'])
      } finally {
        setConfigLoading(false)
      }
    }

    fetchConfigs()
  }, [])

  /**
   * Add a manual response and evaluate it against criteria
   * @param {string} prompt - The original prompt
   * @param {string} response - The manual response to evaluate
   * @param {Array} validatedJson - Validation criteria array
   * @param {string} judgeProvider - Provider to use for evaluation
   * @param {string} judgeModel - Model to use for evaluation
   * @returns {Promise<boolean|null>} Evaluation result
   */
  const addManualResponse = async (prompt, response, validatedJson, judgeProvider, judgeModel) => {
    const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setModelResponses(prev => [{ id: responseId, content: response }, ...prev])
    await evaluate(responseId, validatedJson, prompt, response, judgeProvider, judgeModel)
  }

  /**
   * Cancel the current batch operation
   */
  const cancelBatch = () => {
    if (abortController) {
      abortController.abort()
      setIsSubmitting(false)
      setSubmitMessage('Batch operation cancelled')
    }
  }

  /**
   * Reset all results and counters to initial state
   */
  const resetResults = () => {
    setModelResponses([])
    setJudgeTextResponses([])
    setJudgeParsedResponses([])
    setAttempts(0)
    setWins(0)
    setSubmitMessage('')
  }

  /**
   * Run a single test with the specified model and evaluate the result
   * @param {string} prompt - The prompt to send to the test model
   * @param {Array} criteria - Evaluation criteria array
   * @param {string} testProvider - Provider to use for test model
   * @param {string} testModel - Model to use for generation
   * @param {string} judgeProvider - Provider to use for evaluation
   * @param {string} judgeModel - Model to use for judging responses
   * @returns {Promise<boolean|null>} True if evaluation passed, false if failed, null if error
   */
  const runTestModel = async (prompt, criteria, testProvider, testModel, judgeProvider, judgeModel) => {
    if (!prompt.trim()) {
      setSubmitMessage('Please provide a prompt')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      console.log('Calling LLM with: \n', prompt)

      // Call the LLM using the backend API
      const response = await llmApi.generateResponse(prompt, { ...TEST_MODEL_OPTIONS, model: testModel, provider: testProvider })
      const llmResponse = response.data.response

      setSubmitMessage(`LLM Response: ${llmResponse}`)
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setModelResponses((responses) => {
        return [...responses, { id: responseId, content: llmResponse }]
      })
      const res = await evaluate(responseId, criteria, prompt, llmResponse, judgeProvider, judgeModel)
      return res
    } catch (error) {
      console.error('LLM call failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Evaluate a response against criteria using a judge LLM
   * @param {string} responseId - Unique ID for this response set
   * @param {Array} validatedJson - Array of evaluation criteria objects
   * @param {string} prompt - The original prompt given to the test model
   * @param {string} llmResponse - The response from the test model to evaluate
   * @param {string} judgeProvider - Provider to use for the judge model
   * @param {string} judgeModel - Model to use for evaluation
   * @returns {Promise<boolean|null>} False if evaluation passed (score=0 means failure), true if failed, null if error
   */
  const evaluate = async (responseId, validatedJson, prompt, llmResponse, judgeProvider, judgeModel) => {
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
      const response = await llmApi.generateResponseWithMessages(messages, { ...JUDGE_MODEL, model: judgeModel, provider: judgeProvider })
      console.log("llm rsponse", response)
      const judgeResponse = response.data.response
      setJudgeTextResponses(r => [...r, { id: responseId, content: judgeResponse }])
      const e = parseEvaluation(judgeResponse)
      console.log("extracted", e)
      setJudgeParsedResponses(r => [...r, { id: responseId, ...e }])
      return e.score == 0

    } catch (error) {
      console.error('Judge evaluation failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
    return null
  }

  /**
   * Run batch testing until goal is reached or max attempts exceeded
   * @param {string} prompt - The prompt to test
   * @param {Array} criteria - Evaluation criteria array
   * @param {number} [maxTry=10] - Maximum number of attempts
   * @param {number} [goal=4] - Number of successful evaluations needed
   * @param {string} testProvider - Provider for test model
   * @param {string} testModel - Model for generation
   * @param {string} judgeProvider - Provider for judge model
   * @param {string} judgeModel - Model for evaluation
   */
  const batch = async (prompt, criteria, maxTry = 10, goal = 4, testProvider, testModel, judgeProvider, judgeModel) => {
    const controller = new AbortController()
    setAbortController(controller)
    setAttempts(0)
    setWins(0)
    let localWin = 0
    let localAttempts = 0
    console.log("run batch", maxTry, goal)
    try {
      while (localAttempts < maxTry && localWin < goal && !controller.signal.aborted) {
        try {
          const res = await runTestModel(prompt, criteria, testProvider, testModel, judgeProvider, judgeModel)
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
    } finally {
      setAbortController(null)
    }
  }

  return {
    // State
    /** @type {LLMProviderConfig[]} Available LLM provider configurations */
    llmConfigs,
    /** @type {boolean} Whether configurations are loading */
    configLoading,
    /** @type {Array<{id: string, content: string}>} Model response objects with IDs */
    modelResponses,
    /** @type {Array<{id: string, gradingBasis: Object, score: number}>} Parsed judge evaluation results with IDs */
    judgeParseResponses,
    /** @type {Array<{id: string, content: string}>} Raw judge response texts with IDs */
    judgeTextResponses,
    /** @type {number} Number of successful evaluations */
    wins,
    /** @type {number} Total number of attempts */
    attempts,
    /** @type {boolean} Whether an operation is in progress */
    isSubmitting,
    /** @type {string} Current status message */
    submitMessage,

    // Actions
    /** @type {Function} Run batch testing */
    batch,
    /** @type {Function} Add and evaluate manual response */
    addManualResponse,
    /** @type {Function} Cancel current batch operation */
    cancelBatch,
    /** @type {Function} Reset all results */
    resetResults,
  }
}

export default useLLM
