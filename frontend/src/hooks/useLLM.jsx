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
  reasoning_effort: 'medium',
  // top_p: 0,
}

/**
 * Maximum number of concurrent evaluation runs
 * @constant {number}
 */
const CONCURRENT_RUN_LIMIT = 5

/**
 * Custom hook for LLM operations including model testing, evaluation, and batch processing
 * Manages state for LLM configurations, responses, and evaluation results
 * @param {Function} addMessage - Function to add messages to UI
 * @returns {Object} Hook interface with state and actions
 */
const useLLM = (addMessage) => {
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

  /** @type {Array<{id: string, content: string}>} Raw text responses from judge evaluations with IDs */
  const [judgeTextResponses, setJudgeTextResponses] = useState([])
  /** @type {Array<{id: string, gradingBasis: Object, score: number}>} Parsed evaluation results from judge responses with IDs */
  const [judgeParseResponses, setJudgeParsedResponses] = useState([])
  /** @type {AbortController|null} Controller for cancelling ongoing operations */
  const [abortController, setAbortController] = useState(null)
  const [pendingScoreRunId, setPendingScoreRunId] = useState(null)
  const [scoreState, setScoreState] = useState({
    attempts: 0,
    wins: 0,
    losses: 0,
    parseFailures: 0,
    criteriaStats: {},
  })

  // Fetch LLM configurations from backend on hook initialization
  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const response = await configApi.getAll()
        const configs = response.data
        setLlmConfigs(configs)
      } catch (error) {
        console.warn('Could not fetch LLM configs from backend:', error.message)
        // Fall back to client-side environment variables
        const fallbackConfigs = [
          {
            provider: 'openai',
            defaultModel: 'gpt-4o-mini',
            models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
            isActive: true,
          },
        ]
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
  const addManualResponse = async (
    prompt,
    response,
    validatedJson,
    judgeProvider,
    judgeModel,
    judgeSystemPrompt,
    onProgress,
    runId,
  ) => {
    if (onProgress) onProgress('Adding manual response for evaluation...')

    const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setModelResponses((prev) => [{ id: responseId, content: response, runId }, ...prev])
    await evaluate(
      responseId,
      validatedJson,
      prompt,
      response,
      judgeProvider,
      judgeModel,
      judgeSystemPrompt,
      onProgress,
      runId,
    )
  }

  /**
   * Cancel the current batch operation
   */
  const cancelBatch = () => {
    if (abortController) {
      abortController.abort()
      setIsSubmitting(false)
    }
  }

  /**
   * Reset all results and counters to initial state
   */

  const resetResults = () => {
    setModelResponses([])
    setJudgeTextResponses([])
    setJudgeParsedResponses([])
    setScoreState({
      attempts: 0,
      wins: 0,
      losses: 0,
      parseFailures: 0,
      criteriaStats: {},
    })
  }

  /**
   * Generate a response from an LLM model
   * @param {string} prompt - The prompt to send to the model
   * @param {string} model - Model identifier
   * @param {string} provider - Provider name
   */
  const generate = async (prompt, model, provider) => {
    const requestOptions = { ...TEST_MODEL_OPTIONS, model, provider }
    const response = await llmApi.generateResponse(prompt, requestOptions)

    const llmResponse = response.data?.response || ''

    if (!llmResponse || llmResponse.trim().length === 0) {
      console.warn(`Empty response from ${model}`)
      addMessage('Warning: Empty response from model', 'warning', 'llm')
    }

    return llmResponse
  }

  /**
   * Update score state with evaluation result and return the score
   * @param {Object} evaluation - Parsed evaluation result
   * @returns {number|null} The score from the evaluation
   */
  const score = (evaluation) => {
    let category = 'failure'
    setScoreState((prev) => {
      const newCriteriaStats = { ...prev.criteriaStats }
      Object.entries(evaluation.gradingBasis || {}).forEach(([criteria, result]) => {
        if (!newCriteriaStats[criteria]) {
          newCriteriaStats[criteria] = { pass: 0, fail: 0 }
        }
        if (result === 'PASS') {
          newCriteriaStats[criteria].pass += 1
        } else if (result === 'FAIL') {
          newCriteriaStats[criteria].fail += 1
        }
      })
      const isParseFailure =
        !('score' in evaluation) ||
        evaluation.score == null ||
        typeof evaluation.score !== 'number' ||
        isNaN(evaluation.score)
      const isWin =
        typeof evaluation.score === 'number' && !isNaN(evaluation.score) && evaluation.score === 0
      const isLoss =
        typeof evaluation.score === 'number' && !isNaN(evaluation.score) && evaluation.score > 0
      const isUncounted = !isWin && !isLoss && !isParseFailure

      category = isWin ? 'win' : isLoss ? 'loss' : 'failure'

      return {
        attempts: prev.attempts + 1,
        wins: prev.wins + (isWin ? 1 : 0),
        losses: prev.losses + (isLoss ? 1 : 0),
        parseFailures: prev.parseFailures + (isParseFailure ? 1 : 0),
        criteriaStats: newCriteriaStats,
      }
    })
    return { score: evaluation.score, category }
  }

  /**
   * Run a single evaluation attempt: generate response and evaluate it
   * @param {string} prompt - Prompt to test
   * @param {Array} criteria - Evaluation criteria
   * @param {string} testModel - Test model
   * @param {string} testProvider - Test provider
   * @param {string} judgeModel - Judge model
   * @param {string} judgeProvider - Judge provider
   * @param {string} judgeSystemPrompt - Judge system prompt
   * @param {string} runId - Run identifier
   * @returns {Promise<Object>} Evaluation result
   */
  const run = async (
    prompt,
    criteria,
    testModel,
    testProvider,
    judgeModel,
    judgeProvider,
    judgeSystemPrompt,
    runId,
  ) => {
    addMessage(`Starting evaluation [${runId}]`, 'info', 'evaluation')

    try {
      // Generate response
      const llmResponse = await generate(prompt, testModel, testProvider)

      // Store response
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setModelResponses((responses) => {
        return [...responses, { id: responseId, content: llmResponse, runId }]
      })

      // Evaluate response
      let evaluation
      try {
        evaluation = await evaluateResponse(
          llmResponse,
          criteria,
          prompt,
          responseId,
          judgeModel,
          judgeProvider,
          judgeSystemPrompt,
          runId,
        )
      } catch (error) {
        // Store error as judge response
        setJudgeTextResponses((r) => [
          ...r,
          { id: responseId, content: `Evaluation failed: ${error.message}`, runId },
        ])
        // Return a failed evaluation
        evaluation = {
          gradingBasis: null,
          score: null,
          json: null,
          explanation: `Evaluation failed: ${error.message}`,
        }
      }

      const scoreResult = score(evaluation)
      return { evaluation, ...scoreResult }
    } catch (e) {
      addMessage(`ERROR: ${e.message}`, 'error', 'evaluation')
      throw e
    }
  }

  /**
   * Evaluate a response against criteria using judge model
   * @param {string} response - Response text to evaluate
   * @param {Array} criteria - Evaluation criteria array
   * @param {string} prompt - Original prompt for context
   * @param {string} responseId - Unique identifier for this response
   * @param {string} judgeModel - Judge model to use
   * @param {string} judgeProvider - Judge provider
   * @param {string} judgeSystemPrompt - System prompt for judge
   * @param {string} runId - Run identifier for tracking
   * @returns {Promise<Object>} Parsed evaluation result with gradingBasis, score, json, explanation
   */
  const evaluateResponse = async (
    response,
    criteria,
    prompt,
    responseId,
    judgeModel,
    judgeProvider,
    judgeSystemPrompt,
    runId,
  ) => {
    console.log(
      'Evaluate called with judgeSystemPrompt:',
      judgeSystemPrompt ? 'present' : 'empty',
      judgeSystemPrompt?.length || 0,
      'chars',
    )

    if (!criteria) {
      throw new Error('Please provide valid JSON criteria array')
    }

    // Allow empty responses for evaluation (they should fail criteria)
    const responseText = response || ''

    setIsSubmitting(true)

    try {
      // Fill the judge prompt template
      const responseReference = `Each criterion is evaluated independently as PASS or FAIL.

${JSON.stringify(criteria)}

Failure to PASS more than 50% of the above criteria will result in a score of 0 points.
`

      const judgePrompt = `${prompt}

 ${responseReference}

 ${responseText}
 `

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
      const response = await llmApi.generateResponseWithMessages(messages, {
        ...JUDGE_MODEL,
        model: judgeModel,
        provider: judgeProvider,
      })
      const judgeResponse = response.data.response

      setJudgeTextResponses((r) => [...r, { id: responseId, content: judgeResponse, runId }])
      const e = parseEvaluation(judgeResponse)
      setJudgeParsedResponses((r) => [...r, { id: responseId, ...e, runId }])
      addMessage(`Evaluation completed`, 'success', 'evaluation')

      return e
    } catch (error) {
      console.error('Judge evaluation failed:', error)
      throw error // Re-throw to let caller handle logging
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
   * @param {string} judgeSystemPrompt - System prompt for judge
   * @param {string} runId - Run identifier
   */
  const batch = async (
    prompt,
    criteria,
    maxTry = 10,
    goal = 4,
    testProvider,
    testModel,
    judgeProvider,
    judgeModel,
    judgeSystemPrompt,
    runId,
  ) => {
    const controller = new AbortController()
    setAbortController(controller)
    setScoreState({
      attempts: 0,
      wins: 0,
      losses: 0,
      parseFailures: 0,
      criteriaStats: {},
    })

    addMessage(`Starting batch: ${maxTry} attempts, goal ${goal} wins`, 'info', 'batch')

    try {
      let completed = 0
      let wins = 0

      // Create batches of concurrent runs
      for (
        let i = 0;
        i < maxTry && wins < goal && !controller.signal.aborted;
        i += CONCURRENT_RUN_LIMIT
      ) {
        const batchSize = Math.min(CONCURRENT_RUN_LIMIT, maxTry - i)
        const runPromises = []

        for (let j = 0; j < batchSize; j++) {
          const attemptRunId = runId
          runPromises.push(
            run(
              prompt,
              criteria,
              testModel,
              testProvider,
              judgeModel,
              judgeProvider,
              judgeSystemPrompt,
              attemptRunId,
            ),
          )
        }

        const results = await Promise.allSettled(runPromises)

        for (const result of results) {
          completed++
          if (result.status === 'fulfilled') {
            const { evaluation, score, category } = result.value
            // score() already called in run
            if (category === 'win') {
              wins++
              addMessage(
                `Attempt ${completed}/${maxTry} - SUCCESS! (${wins}/${goal} wins)`,
                'success',
                'batch',
              )
            } else {
              addMessage(
                `Attempt ${completed}/${maxTry} - ${category.toUpperCase()} (${wins}/${goal} wins)`,
                'info',
                'batch',
              )
            }
          } else {
            // Handle failed run
            addMessage(
              `Attempt ${completed}/${maxTry} - ERROR: ${result.reason.message}`,
              'error',
              'batch',
            )
          }

          if (wins >= goal) break
        }

        // Small delay between batches
        if (i + CONCURRENT_RUN_LIMIT < maxTry) {
          await sleep(100)
        }
      }

      if (controller.signal.aborted) {
        addMessage('Batch cancelled by user', 'warning', 'batch')
      } else {
        if (wins >= goal) {
          addMessage(
            `🎉 Goal reached! ${wins}/${goal} wins achieved in ${completed} attempts`,
            'success',
            'batch',
          )
        } else {
          addMessage(
            `Batch completed: ${wins} wins, ${completed} attempts (goal not reached)`,
            'info',
            'batch',
          )
        }
      }
    } finally {
      setAbortController(null)
    }
  }

  return {
    // State
    llmConfigs,
    configLoading,
    modelResponses,
    judgeParseResponses,
    judgeTextResponses,
    scoreState,
    isSubmitting,

    // Core functions
    generate,
    evaluate: evaluateResponse,
    score,

    // High-level operations
    run,
    batch,
    addManualResponse,
    cancelBatch,
    resetResults,
  }
}

export default useLLM
