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
  reasoning_effort: "medium"
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

  /** @type {Array<{id: string, content: string}>} Raw text responses from judge evaluations with IDs */
  const [judgeTextResponses, setJudgeTextResponses] = useState([])
  /** @type {Array<{id: string, gradingBasis: Object, score: number}>} Parsed evaluation results from judge responses with IDs */
  const [judgeParseResponses, setJudgeParsedResponses] = useState([])
  const [batchResults, setBatchResults] = useState({}) // Store batch-level results
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
  const addManualResponse = async (prompt, response, validatedJson, judgeProvider, judgeModel, judgeSystemPrompt, onProgress, runId) => {
    if (onProgress) onProgress('Adding manual response for evaluation...')

    const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setModelResponses(prev => [{ id: responseId, content: response, runId }, ...prev])
    await evaluate(responseId, validatedJson, prompt, response, judgeProvider, judgeModel, judgeSystemPrompt, onProgress, runId)
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
  // Analyze batch diversity criteria
  const analyzeBatchDiversity = (runId) => {
    // Get all parsed responses for this run
    const runResponses = judgeParseResponses.filter(r => r.runId === runId)

    if (runResponses.length === 0) return null

    // Get grading basis from first response to know criteria names
    const firstResponse = runResponses[0]
    if (!firstResponse.gradingBasis) return null

    const criteriaNames = Object.keys(firstResponse.gradingBasis)
    let diverseCriteriaCount = 0

    // For each criteria, check if it has both PASS and FAIL across all attempts
    for (const criteriaName of criteriaNames) {
      const results = runResponses.map(r => r.gradingBasis[criteriaName])
      const hasPass = results.includes('PASS')
      const hasFail = results.includes('FAIL')

      if (hasPass && hasFail) {
        diverseCriteriaCount++
      }
    }

    // Most criteria (more than half) must have diversity
    const requiredDiversity = Math.ceil(criteriaNames.length / 2)
    const batchWin = diverseCriteriaCount >= requiredDiversity

    const batchResult = {
      runId,
      totalCriteria: criteriaNames.length,
      diverseCriteria: diverseCriteriaCount,
      requiredDiversity,
      batchWin,
      criteriaDetails: criteriaNames.map(name => ({
        name,
        hasDiversity: runResponses.some(r => r.gradingBasis[name] === 'PASS') &&
                     runResponses.some(r => r.gradingBasis[name] === 'FAIL')
      }))
    }

    setBatchResults(prev => ({ ...prev, [runId]: batchResult }))
    return batchResult
  }

  const resetResults = () => {
    setModelResponses([])
    setJudgeTextResponses([])
    setJudgeParsedResponses([])
    setBatchResults({})
    setAttempts(0)
    setWins(0)
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
  const runTestModel = async (prompt, criteria, testProvider, testModel, judgeProvider, judgeModel, onProgress, runId, judgeSystemPrompt) => {
    if (!prompt.trim()) {
      throw new Error('Please provide a prompt')
    }

    setIsSubmitting(true)

    try {
      if (onProgress) onProgress('Starting model generation...')

      // Call the LLM using the backend API
      if (onProgress) onProgress('Generating response...')

      const requestOptions = { ...TEST_MODEL_OPTIONS, model: testModel, provider: testProvider }
      const response = await llmApi.generateResponse(prompt, requestOptions)

      const llmResponse = response.data?.response || ''

      if (!llmResponse || llmResponse.trim().length === 0) {
        console.warn(`Empty response from ${testModel}`)
        if (onProgress) onProgress('Warning: Empty response from model')
      }

      if (onProgress) onProgress(`Response generated (${llmResponse.length} chars)`)

      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Always store the response, even if empty
      setModelResponses((responses) => {
        return [...responses, { id: responseId, content: llmResponse, runId }]
      })

      if (onProgress) onProgress('Starting evaluation...')

      try {
        const res = await evaluate(responseId, criteria, prompt, llmResponse, judgeProvider, judgeModel, judgeSystemPrompt, onProgress, runId)

        if (onProgress) onProgress(`Evaluation completed: ${res ? 'PASS' : 'FAIL'}`)
        return res
      } catch (evalError) {
        console.error('Evaluation failed:', evalError)
        if (onProgress) onProgress(`Evaluation failed: ${evalError.message}`)
        throw evalError
      }
    } catch (error) {
      console.error('LLM call failed:', error)
      if (onProgress) onProgress(`Model generation failed: ${error.message}`)
      throw error // Re-throw to let caller handle logging
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
    * @returns {Promise<boolean>} True if evaluation passed (score > 0 means success), false if failed
   */
  const evaluate = async (responseId, validatedJson, prompt, llmResponse, judgeProvider, judgeModel, judgeSystemPrompt, onProgress, runId) => {
    console.log('Evaluate called with judgeSystemPrompt:', judgeSystemPrompt ? 'present' : 'empty', judgeSystemPrompt?.length || 0, 'chars')

    if (!validatedJson) {
      throw new Error('Please provide valid JSON criteria array')
    }

    // Allow empty responses for evaluation (they should fail criteria)
    if (llmResponse === undefined || llmResponse === null) {
      llmResponse = ''
    }

    setIsSubmitting(true)

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

      console.log('Judge API call messages:', {
        systemMessageLength: judgeSystemPrompt?.length || 0,
        userMessageLength: judgePrompt?.length || 0,
        systemContentPreview: judgeSystemPrompt?.substring(0, 100) + '...'
      })

      // Call the LLM using the backend API with messages
      const response = await llmApi.generateResponseWithMessages(messages, { ...JUDGE_MODEL, model: judgeModel, provider: judgeProvider })
      const judgeResponse = response.data.response

      setJudgeTextResponses(r => [...r, { id: responseId, content: judgeResponse, runId }])
      const e = parseEvaluation(judgeResponse)
      setJudgeParsedResponses(r => [...r, { id: responseId, ...e, runId }])

      const passed = e.score > 0
      if (onProgress) onProgress(`Evaluation: ${passed ? 'PASS' : 'FAIL'}`)

      return passed

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
   */
  const batch = async (prompt, criteria, maxTry = 10, goal = 4, testProvider, testModel, judgeProvider, judgeModel, judgeSystemPrompt, onProgress, runId) => {
    const controller = new AbortController()
    setAbortController(controller)
    setAttempts(0)
    setWins(0)
    let localWin = 0
    let localAttempts = 0

    if (onProgress) onProgress(`Starting batch: ${maxTry} attempts, goal ${goal} wins`)

    try {
      while (localAttempts < maxTry && localWin < goal && !controller.signal.aborted) {
        localAttempts++
        if (onProgress) onProgress(`Attempt ${localAttempts}/${maxTry} - Starting...`)

        try {
          const res = await runTestModel(prompt, criteria, testProvider, testModel, judgeProvider, judgeModel,
            (progressMsg) => onProgress && onProgress(`Attempt ${localAttempts}/${maxTry} - ${progressMsg}`), runId, judgeSystemPrompt)

          if (res) {
            localWin++
          }

          if (onProgress) onProgress(`Attempt ${localAttempts}/${maxTry} - ${res ? 'PASS' : 'FAIL'} (${localWin}/${goal} wins)`)

          setAttempts(localAttempts)
          setWins(localWin)

          // Check if goal reached
          if (localWin >= goal) {
            if (onProgress) onProgress(`🎉 Goal reached! ${localWin}/${goal} wins achieved in ${localAttempts} attempts`)
            break
          }

        } catch (e) {
          // Parsing failed - this counts as an attempt but not a win/loss
          if (onProgress) onProgress(`Attempt ${localAttempts}/${maxTry} - PARSING FAILED: ${e.message}`)
          setAttempts(localAttempts)
          // Don't increment wins for failed parsing
        }

        await sleep(500)
      }

      if (onProgress) {
        if (controller.signal.aborted) {
          onProgress('Batch cancelled by user')
        } else {
          // Analyze batch diversity
          const batchAnalysis = analyzeBatchDiversity(runId)

          if (batchAnalysis) {
            const batchStatus = batchAnalysis.batchWin ? '🎉 SUCCESS' : '❌ FAILURE'
            const diversityMsg = `${batchAnalysis.diverseCriteria}/${batchAnalysis.totalCriteria} criteria diverse`

            if (localWin >= goal) {
              onProgress(`${batchStatus} - Goal reached! ${localWin}/${goal} wins (${diversityMsg})`)
            } else {
              onProgress(`${batchStatus} - Completed: ${localWin} wins, ${localAttempts} attempts (${diversityMsg})`)
            }
          } else {
            if (localWin >= goal) {
              onProgress(`🎉 Goal reached! ${localWin}/${goal} wins achieved in ${localAttempts} attempts`)
            } else {
              onProgress(`Batch completed: ${localWin} wins, ${localAttempts} attempts (goal not reached)`)
            }
          }
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
    wins,
    attempts,
    batchResults,
    isSubmitting,

    // Actions
    batch,
    addManualResponse,
    cancelBatch,
    resetResults,
    analyzeBatchDiversity,
  }
}

export default useLLM
