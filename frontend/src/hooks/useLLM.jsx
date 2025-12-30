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
 * Custom hook for LLM operations including model testing, evaluation, and batch processing.
 * Manages state for LLM configurations, responses, and evaluation results.
 * Provides functions for generating responses, evaluating them against criteria, and running batch tests.
 * @param {Function} addMessage - Function to add messages to the UI (signature: (message: string, type: string, category: string) => void)
 * @returns {{
 *   llmConfigs: Array,
 *   configLoading: boolean,
 *   runContext: Array<{id: string, runId: string, status?: 'generating' | 'evaluating' | 'parsing' | 'scoring' | 'completed' | 'error', modelContent?: string, judgeText?: string, gradingBasis?: Object, score?: number, json?: any, explanation?: string}>,
 *   scoreState: {attempts: number, wins: number, losses: number, failures: number, criteriaStats: Object},
 *   isSubmitting: boolean,
 *   generate: Function,
 *   evaluate: Function,
 *   score: Function,
 *   run: Function,
 *   batch: Function,
 *   addManualResponse: Function,
 *   cancelBatch: Function,
 *   resetResults: Function
 * }} Hook interface with state and actions
 */
const useLLM = (addMessage) => {
  // State management
  /** @type {LLMProviderConfig[]} Array of available LLM provider configurations */
  const [llmConfigs, setLlmConfigs] = useState([])
  /** @type {boolean} Whether LLM configurations are still loading */
  const [configLoading, setConfigLoading] = useState(true)
  /** @type {Array<{id: string, runId: string, status?: 'generating' | 'evaluating' | 'parsing' | 'scoring' | 'completed' | 'error', modelContent?: string, judgeText?: string, gradingBasis?: Object, score?: number, json?: any, explanation?: string}>} Array of flattened run context objects containing all response data for each run */
  const [runContext, setRunContext] = useState([])
  /** @type {boolean} Whether a submission is currently in progress */
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** @type {AbortController|null} Controller for cancelling ongoing operations */
  const [abortController, setAbortController] = useState(null)
  const [scoreState, setScoreState] = useState({
    attempts: 0,
    wins: 0,
    losses: 0,
    failures: 0,
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
        // No fallback - require backend to be running for configs
        setLlmConfigs([])
        addMessage(
          'Warning: Could not load LLM configurations. Please ensure the backend is running.',
          'warning',
          'config',
        )
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
   * @param {string} judgeSystemPrompt - System prompt for judge
   * @param {string} runId - Run identifier
   * @returns {Promise<boolean|null>} Evaluation result
   */
  const addManualResponse = async (
    prompt,
    response,
    validatedJson,
    judgeProvider,
    judgeModel,
    judgeSystemPrompt,
    runId,
  ) => {
    addMessage('Adding manual response for evaluation...', 'info', 'manual')

    const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setRunContext((prev) => [
      { id: responseId, runId, status: 'evaluating', modelContent: response },
      ...prev,
    ])
    await evaluateResponse(
      response,
      validatedJson,
      prompt,
      responseId,
      judgeModel,
      judgeProvider,
      judgeSystemPrompt,
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
    setRunContext([])
    setScoreState({
      attempts: 0,
      wins: 0,
      losses: 0,
      failures: 0,
      criteriaStats: {},
    })
  }

  /**
   * Generate a response from an LLM model
   * @param {string} prompt - The prompt to send to the model
   * @param {string} model - Model identifier
   * @param {string} provider - Provider name
   * @returns {Promise<string>} The generated response text
   * @returns {Promise<string>} The generated response text
   */
  const generate = async (prompt, model, provider) => {
    console.log('Sending generation request to backend:', {
      model,
      provider,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
    })

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
        failures: prev.failures + (isParseFailure ? 1 : 0),
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
      // Create initial run context entry
      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setRunContext((prev) => {
        return [...prev, { id: responseId, runId, status: 'generating' }]
      })

      // Generate response
      const llmResponse = await generate(prompt, testModel, testProvider)

      // Update status and add model content
      setRunContext((prev) =>
        prev.map((item) =>
          item.id === responseId
            ? { ...item, status: 'evaluating', modelContent: llmResponse }
            : item,
        ),
      )

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
        // Store error as judge response and set status to error
        setRunContext((prev) =>
          prev.map((item) =>
            item.id === responseId
              ? { ...item, status: 'error', judgeText: `Evaluation failed: ${error.message}` }
              : item,
          ),
        )
        // Return a failed evaluation
        evaluation = {
          gradingBasis: null,
          score: null,
          json: null,
          explanation: `Evaluation failed: ${error.message}`,
        }
      }

      const scoreResult = score(evaluation)

      // Check if evaluation was valid (has some meaningful data)
      const isValidEvaluation =
        evaluation &&
        (evaluation.gradingBasis || evaluation.score != null || evaluation.explanation)

      // Set status to completed only if evaluation was valid
      if (isValidEvaluation) {
        setRunContext((prev) =>
          prev.map((item) => (item.id === responseId ? { ...item, status: 'completed' } : item)),
        )
      }

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
    if (!criteria) {
      throw new Error('Please provide valid JSON criteria array')
    }

    // Allow empty responses for evaluation (they should fail criteria)
    const responseText = response || ''

    setIsSubmitting(true)

    try {
      // Fill the judge prompt template
      const responseReference = `Each criterion is evaluated independently as PASS or FAIL.

${JSON.stringify(criteria, null, 4)}

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
      console.log('Sending evaluation request to backend:', {
        judgeModel,
        judgeProvider,
        messagesCount: messages.length,
        systemMessageLength: messages[0]?.content?.length || 0,
        userMessagePreview: messages[1]?.content?.substring(0, 200) + '...',
      })

      const response = await llmApi.generateResponseWithMessages(messages, {
        ...JUDGE_MODEL,
        model: judgeModel,
        provider: judgeProvider,
      })
      const judgeResponse = response.data.response

      // Set status to parsing
      setRunContext((prev) =>
        prev.map((item) =>
          item.id === responseId ? { ...item, status: 'parsing', judgeText: judgeResponse } : item,
        ),
      )

      const e = parseEvaluation(judgeResponse)

      // Check if evaluation is valid (not null/undefined)
      const isValidEvaluation = e && (e.gradingBasis || e.score != null || e.explanation)

      setRunContext((prev) =>
        prev.map((item) =>
          item.id === responseId
            ? {
                ...item,
                status: isValidEvaluation ? 'scoring' : 'error',
                gradingBasis: e?.gradingBasis || null,
                score: e?.score || null,
                json: e?.json || null,
                explanation:
                  e?.explanation || (isValidEvaluation ? null : 'Evaluation parsing failed'),
              }
            : item,
        ),
      )
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
      failures: 0,
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
    runContext,
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
