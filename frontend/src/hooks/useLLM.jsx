import { useState, useEffect } from 'react'
import { useMemo } from 'react'
import { modelApi } from '../services'
import { useSocket } from '../contexts/SocketContext'
import { cib500px } from '@coreui/icons'
import { sleep } from '../utils/tools'
import { parseEvaluation } from '../utils/parser'
import { configs } from 'eslint-plugin-prettier'

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
  openaiReasoning: true, // Enable OpenAI responses.stream API for reasoning
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
 *   runContext: Array<{id: string, runId: string, status?: 'generating' | 'evaluating' | 'parsing' | 'scoring' | 'completed' | 'error', modelContent?: string, judgeText?: string, gradingBasis?: Object, score?: number, json?: any, explanation?: string, error?: string}>,
 *   scoreState: {attempts: number, wins: number, losses: number, failures: number, criteriaStats: Object},
 *   isRunning: boolean,
 *   setRunContext: Function,
 *   generate: Function,
 *   evaluate: Function,
 *   score: Function,
 *   run: Function,
 *   batch: Function,
 *   reEvaluate: Function,
 *   addManualResponse: Function,
 *   cancelBatch: Function,
 *   resetResults: Function
 * }} Hook interface with state and actions
 */
const useLLM = (addMessage) => {
  const { socket, isConnected } = useSocket()

  // State management
  /** @type {LLMProviderConfig[]} Array of available LLM provider configurations */
  const [llmConfigs, setLlmConfigs] = useState([])
  /** @type {boolean} Whether LLM configurations are still loading */
  const [configLoading, setConfigLoading] = useState(true)
  /** @type {Array<{id: string, runId: string, status?: 'generating' | 'evaluating' | 'parsing' | 'scoring' | 'completed' | 'error', modelContent?: string, modelReasoning?: string, judgeText?: string, judgeReasoning?: string, gradingBasis?: Object, score?: number, json?: any, explanation?: string}>} Array of flattened run context objects containing all response data for each run */
  const [runContext, setRunContext] = useState([])
  /** @type {boolean} Whether a submission is currently in progress */
  const isRunning = useMemo(
    () =>
      runContext.some((item) =>
        ['generating', 'evaluating', 'parsing', 'scoring'].includes(item.status),
      ),
    [runContext],
  )
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
        const response = await modelApi.getAll()
        console.log(response)
        const configs = response.data
        console.log("config fetched", configs)
        const allModels =
          configs.reduce((acc, item) => {
            acc[item.name] = item.options
            return acc
          }, {})
        setLlmConfigs(allModels)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getModelOptions = (name, agent) => {
    console.log("get llm options", name)
    const conf = llmConfigs[agent]?.filter(i => i.option === name).at(0)
    console.log("model options", conf, llmConfigs, name, agent)
    return conf
  }

  /**
   * Add a manual response and evaluate it against criteria
   * @param {string} prompt - The original prompt
   * @param {string} response - The manual response to evaluate
   * @param {Array} validatedJson - Validation criteria array
   * @param {string} judgeModel - Model to use for evaluation
   * @param {string} judgeSystemPrompt - System prompt for judge
   * @param {string} runId - Run identifier
   * @returns {Promise<boolean|null>} Evaluation result
   */
  const addManualResponse = async (
    prompt,
    response,
    validatedJson,
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

    try {
      const evaluation = await evaluateResponse(
        response,
        validatedJson,
        prompt,
        responseId,
        judgeModel,
        judgeSystemPrompt,
        runId,
      )

      // Check if evaluation was valid and set status to completed
      const isValidEvaluation =
        evaluation &&
        (evaluation.gradingBasis || evaluation.score != null || evaluation.explanation)

      if (isValidEvaluation) {
        setRunContext((prev) =>
          prev.map((item) => (item.id === responseId ? { ...item, status: 'completed' } : item)),
        )
        addMessage('Manual response evaluation completed', 'success', 'manual')
      } else {
        addMessage('Manual response evaluation failed', 'warning', 'manual')
      }

      return evaluation
    } catch (error) {
      addMessage(`Manual response evaluation failed: ${error.message}`, 'error', 'manual')
      setRunContext((prev) =>
        prev.map((item) =>
          item.id === responseId
            ? { ...item, status: 'error', error: error.message }
            : item,
        ),
      )
      throw error
    }
  }

  /**
   * Cancel the current batch operation
   */
  const cancelBatch = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  /**
   * Re-evaluate a specific response against criteria
   * @param {Object} responseItem - The response item to re-evaluate
   * @param {Array} criteria - Evaluation criteria array
   * @param {string} prompt - Original prompt
   * @param {string} judgeModel - Judge model to use
   * @param {string} judgeSystemPrompt - System prompt for judge
   */
  const reEvaluate = async (
    responseItem,
    criteria,
    prompt,
    judgeModel,
    judgeSystemPrompt,
  ) => {
    addMessage(`Re-evaluating response [${responseItem.id}]`, 'info', 'reevaluate')

    // Update status to evaluating
    setRunContext((prev) =>
      prev.map((item) => (item.id === responseItem.id ? { ...item, status: 'evaluating' } : item)),
    )

    try {
      const evaluation = await evaluateResponse(
        responseItem.modelContent,
        criteria,
        prompt,
        responseItem.id,
        judgeModel,
        judgeSystemPrompt,
        responseItem.runId,
      )

      // Check if evaluation was valid and set status to completed
      const isValidEvaluation =
        evaluation &&
        (evaluation.gradingBasis || evaluation.score != null || evaluation.explanation)

      if (isValidEvaluation) {
        setRunContext((prev) =>
          prev.map((item) =>
            item.id === responseItem.id ? { ...item, status: 'completed' } : item,
          ),
        )
      }

      addMessage(`Re-evaluation completed for [${responseItem.id}]`, 'success', 'reevaluate')
    } catch (error) {
      addMessage(
        `Re-evaluation failed for [${responseItem.id}]: ${error.message}`,
        'error',
        'reevaluate',
      )
      setRunContext((prev) =>
        prev.map((item) =>
          item.id === responseItem.id
            ? {
              ...item,
              status: 'error',
              error: error.message,
            }
            : item,
        ),
      )
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
   * @returns {Promise<string>} The generated response text
   */
  const generate = async (prompt, modelName) => {
    if (!socket || !isConnected) {
      throw new Error('WebSocket not connected. Please check your authentication.')
    }

    const { model, provider, params } = getModelOptions(modelName, 'test')

    console.log('Sending generation request to backend:', {
      model,
      provider,
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
    })

    const requestOptions = { ...params, model, provider }
    const requestId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return new Promise((resolve, reject) => {
      let accumulatedResponse = ''
      let accumulatedReasoning = ''

      const handleChunk = (data) => {
        if (data.id === requestId) {
          if (data.chunk) accumulatedResponse += data.chunk
          if (data.reasoning) accumulatedReasoning += data.reasoning
        }
      }

      const handleComplete = (data) => {
        if (data.id === requestId) {
          const llmResponse = data.response || accumulatedResponse
          const llmReasoning = data.reasoning || accumulatedReasoning
          if (!llmResponse || llmResponse.trim().length === 0) {
            console.warn(`Empty response from ${model}`)
            addMessage('Warning: Empty response from model', 'warning', 'llm')
          }
          cleanup()
          resolve({ response: llmResponse, reasoning: llmReasoning })
        }
      }

      const handleError = (error) => {
        if (error.id === requestId) {
          console.error('LLM streaming error:', error)
          cleanup()
          reject(error)
        }
      }

      const cleanup = () => {
        socket.off('chunk', handleChunk)
        socket.off('complete', handleComplete)
        socket.off('error', handleError)
      }

      socket.on('chunk', handleChunk)
      socket.on('complete', handleComplete)
      socket.on('error', handleError)

      socket.emit('generate', { id: requestId, prompt, options: requestOptions })

      // Timeout after 5 minutes
      setTimeout(
        () => {
          cleanup()
          reject(new Error('Generation request timed out'))
        },
        5 * 60 * 1000,
      )
    })
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
   * @param {string} judgeModel - Judge model
   * @param {string} judgeSystemPrompt - Judge system prompt
   * @param {string} runId - Run identifier
   * @returns {Promise<Object>} Evaluation result
   */
  const run = async (
    prompt,
    criteria,
    testModel,
    judgeModel,
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

      let llmResponse, llmReasoning
      try {
        // Generate response
        const result = await generate(prompt, testModel)
        llmResponse = result.response
        llmReasoning = result.reasoning
      } catch (error) {
        // Set status to error on generation failure
        setRunContext((prev) =>
          prev.map((item) =>
            item.id === responseId
              ? {
                ...item,
                status: 'error',
                error: error.message,
              }
              : item,
          ),
        )
        throw error // Re-throw to stop execution
      }

      // Update status and add model content and reasoning
      setRunContext((prev) =>
        prev.map((item) =>
          item.id === responseId
            ? {
              ...item,
              status: 'evaluating',
              modelContent: llmResponse,
              modelReasoning: llmReasoning,
            }
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
          judgeSystemPrompt,
          runId,
        )
      } catch (error) {
        // Store error as judge response and set status to error
        setRunContext((prev) =>
          prev.map((item) =>
            item.id === responseId
              ? {
                ...item,
                status: 'error',
                error: error.message,
              }
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

      // Set status to completed only if evaluation was valid and not already error
      if (isValidEvaluation) {
        setRunContext((prev) =>
          prev.map((item) =>
            item.id === responseId && item.status !== 'error'
              ? { ...item, status: 'completed' }
              : item,
          ),
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
   * @param {string} judgeSystemPrompt - System prompt for judge
   * @param {string} runId - Run identifier for tracking
   * @returns {Promise<Object>} Parsed evaluation result with gradingBasis, score, json, explanation
   */
  const evaluateResponse = async (
    response,
    criteria,
    prompt,
    responseId,
    judgeModelName,
    judgeSystemPrompt,
    runId,
  ) => {
    if (!criteria) {
      throw new Error('Please provide valid JSON criteria array')
    }

    // Allow empty responses for evaluation (they should fail criteria)
    const responseText = response || ''

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

      const { model: judgeModel, provider: judgeProvider, params } = getModelOptions(judgeModelName, 'judge')

      // Call the LLM using WebSocket streaming
      console.log('Sending evaluation request to backend:', {
        judgeModel,
        judgeProvider,
        messagesCount: messages.length,
        systemMessageLength: messages[0]?.content?.length || 0,
        userMessagePreview: messages[1]?.content?.substring(0, 200) + '...',
      })

      if (!socket || !isConnected) {
        throw new Error('WebSocket not connected. Please check your authentication.')
      }

      return new Promise((resolve, reject) => {
        let judgeResponse = ''
        let judgeReasoning = ''
        let timeoutId

        const handleChunk = (data) => {
          if (data.id === responseId) {
            if (data.chunk) judgeResponse += data.chunk
            if (data.reasoning) judgeReasoning += data.reasoning
          }
        }

        const handleComplete = (data) => {
          if (data.id === responseId) {
            // Clear timeout immediately to prevent timeout callback from running
            clearTimeout(timeoutId)

            const fullResponse = data.response || judgeResponse
            const fullReasoning = data.reasoning || judgeReasoning
            // Set status to parsing
            setRunContext((prev) =>
              prev.map((item) =>
                item.id === responseId
                  ? {
                    ...item,
                    status: 'parsing',
                    judgeText: fullResponse,
                    judgeReasoning: fullReasoning,
                  }
                  : item,
              ),
            )

            try {
              // Parse the evaluation result
              const evaluation = parseEvaluation(fullResponse)

              // Check if evaluation is valid (not null/undefined)
              const isValidEvaluation =
                evaluation &&
                (evaluation.gradingBasis || evaluation.score != null || evaluation.explanation)

              setRunContext((prev) =>
                prev.map((item) =>
                  item.id === responseId
                    ? {
                      ...item,
                      status: isValidEvaluation ? 'scoring' : 'error',
                      gradingBasis: evaluation?.gradingBasis || null,
                      score: evaluation?.score || null,
                      json: evaluation?.json || null,
                      explanation:
                        evaluation?.explanation ||
                        (isValidEvaluation ? null : 'Evaluation parsing failed'),
                      error: isValidEvaluation ? undefined : 'Evaluation parsing failed',
                    }
                    : item,
                ),
              )

              addMessage(`Evaluation completed`, 'success', 'evaluation')
              resolve(evaluation)
            } catch (parseError) {
              console.error('Evaluation parsing failed:', parseError)
              setRunContext((prev) =>
                prev.map((item) =>
                  item.id === responseId
                    ? {
                      ...item,
                      status: 'error',
                      error: parseError.message,
                    }
                    : item,
                ),
              )
              resolve(null) // Return null on parse error
            } finally {
              cleanup()
            }
          }
        }

        const handleError = (error) => {
          if (error.id === responseId) {
            console.error('Evaluation streaming error:', error)
            setRunContext((prev) =>
              prev.map((item) =>
                item.id === responseId
                  ? { ...item, status: 'error', error: error.message }
                  : item,
              ),
            )
            cleanup()
            reject(new Error(error.message || 'Evaluation failed'))
          }
        }

        const cleanup = () => {
          socket.off('chunk', handleChunk)
          socket.off('complete', handleComplete)
          socket.off('error', handleError)
        }

        socket.on('chunk', handleChunk)
        socket.on('complete', handleComplete)
        socket.on('error', handleError)

        socket.emit('generate-with-messages', {
          id: responseId,
          messages,
          options: {
            ...params,
            model: judgeModel,
            provider: judgeProvider,
          },
        })

        // Timeout after 5 minutes
        timeoutId = setTimeout(
          () => {
            cleanup()
            console.error('Evaluation request timed out')
            setRunContext((prev) =>
              prev.map((item) =>
                item.id === responseId
                  ? {
                    ...item,
                    status: 'error',
                    error: 'Evaluation request timed out',
                  }
                  : item,
              ),
            )
            reject(new Error('Evaluation request timed out'))
          },
          5 * 60 * 1000,
        )
      })
    } catch (error) {
      console.error('Judge evaluation failed:', error)
      throw error // Re-throw to let caller handle logging
    } finally {
      // No state to reset
    }
    return null
  }

  /**
   * Run batch testing until goal is reached or max attempts exceeded
   * @param {string} prompt - The prompt to test
   * @param {Array} criteria - Evaluation criteria array
   * @param {number} [maxTry=10] - Maximum number of attempts
   * @param {number} [goal=4] - Number of successful evaluations needed
   * @param {string} testModel - Model for generation
   * @param {string} judgeModel - Model for evaluation
   * @param {string} judgeSystemPrompt - System prompt for judge
   * @param {string} runId - Run identifier
   */
  const batch = async (
    prompt,
    criteria,
    maxTry = 10,
    goal = 4,
    testModel,
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
              judgeModel,
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
    isRunning,
    setRunContext,

    // Core functions
    generate,
    evaluate: evaluateResponse,
    score,

    // High-level operations
    run,
    batch,
    reEvaluate,
    addManualResponse,
    cancelBatch,
    resetResults,
  }
}

export default useLLM
