import React, { useEffect, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CForm, CRow } from '@coreui/react'
import useLLM from '../../../hooks/useLLM'
import { useLog } from '../../../contexts/LogContext'
import { generateNotebookTemplate } from '../../../utils/tools'
import {
  LLMConfigSelector,
  PromptFormFields,
  ActivityConsole,
  ResultsAccordion,
  Scoreboard,
} from './index'

const JsonPromptForm = () => {
  const [criteriaJson, setCriteriaJson] = useState('')
  const [idealResponse, setIdealResponse] = useState('')
  const [prompt, setPrompt] = useState('')
  const [judgeSystemPrompt, setJudgeSystemPrompt] = useState('')
  const [validatedJson, setValidatedJson] = useState(null)
  const [maxTry, setMaxTry] = useState(5)
  const [judgeProvider, setJudgeProvider] = useState('')
  const [judgeModel, setJudgeModel] = useState('')
  const [testProvider, setTestProvider] = useState('')
  const [testModel, setTestModel] = useState('')

  // Use the centralized log context
  const { addMessage } = useLog()

  // Use the LLM hook for all LLM-related functionality
  const {
    llmConfigs,
    configLoading,
    runContext,
    scoreState,
    isRunning,
    generate,
    evaluate: evaluateResponse,
    score,
    run,
    batch,
    reEvaluate,
    addManualResponse,
    cancelBatch,
    resetResults,
  } = useLLM(addMessage)

  // Helper function to find provider for a given model
  const findProviderForModel = (model) => {
    if (!model || !llmConfigs) return null
    return llmConfigs.find((config) => config.models.includes(model))?.provider || null
  }

  // Event handlers
  const handleJsonValid = (parsedArray) => {
    setValidatedJson(parsedArray)
  }

  const handleTestModelChange = (model) => {
    setTestModel(model)
    const provider = findProviderForModel(model)
    if (provider) setTestProvider(provider)
  }

  const handleJudgeModelChange = (model) => {
    setJudgeModel(model)
    const provider = findProviderForModel(model)
    if (provider) setJudgeProvider(provider)
  }

  const handleReEvaluate = (responseItem) => {
    reEvaluate(responseItem, validatedJson, prompt, judgeModel, judgeProvider, judgeSystemPrompt)
  }

  const handleExport = () => {
    const wordCount = prompt.split(/\s+/).filter((word) => word.length > 0).length
    const promptLengthCategory =
      wordCount < 20 ? '< 20 words' : wordCount <= 50 ? '20 - 50 words' : '> 50 words'

    const data = {
      taskId: `e${Date.now().toString(36)}${Math.random().toString(36).substr(2, 5)}`,
      domain: 'Education & Research',
      promptLength: promptLengthCategory,
      userPrompt: prompt,
      idealResponse: idealResponse || undefined,
      criteria: validatedJson || [],
      judgePromptTemplate:
        '<Question>:{prompt}\n\n<Standard Answer>:{response_reference}\n\n<Student Answer>:{response}',
      judgeSystemPrompt: judgeSystemPrompt,
      responses: runContext.map((item) => ({
        model: testModel || 'unknown_model',
        content: item.modelContent,
        judgeText: item.judgeText,
        isManual: item.modelContent === idealResponse,
      })),
      attempts: runContext.length,
    }

    const notebookJson = generateNotebookTemplate(data)

    // Create blob and download
    const blob = new Blob([notebookJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evaluation_${data.taskId}.ipynb`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    addMessage('Notebook exported successfully', 'success', 'export')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const action = event.nativeEvent.submitter.value

    // Generate unique run ID for this operation
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`

    try {
      if (action === 'run') {
        // Validate required fields
        if (!testModel || !testProvider) {
          console.error('Missing test model/provider')
          alert('Please select a test model and provider')
          addMessage('❌ Please select a test model and provider', 'error', 'system')
          return
        }
        if (!judgeModel || !judgeProvider) {
          console.error('Missing judge model/provider')
          alert('Please select a judge model and provider')
          addMessage('❌ Please select a judge model and provider', 'error', 'system')
          return
        }
        if (!validatedJson || validatedJson.length === 0) {
          console.error('Missing or invalid criteria')
          alert('Please provide valid evaluation criteria')
          addMessage('❌ Please provide valid evaluation criteria', 'error', 'system')
          return
        }

        addMessage(`🚀 Starting batch run [${runId}] with ${maxTry} attempts`, 'info', 'batch')
        addMessage(`📝 Test Model: ${testModel} (${testProvider})`, 'info', 'batch')
        addMessage(`🔍 Judge Model: ${judgeModel} (${judgeProvider})`, 'info', 'batch')
        addMessage(`🎯 Goal: 4 successful evaluations`, 'info', 'batch')

        await batch(
          prompt,
          validatedJson,
          maxTry,
          4,
          testProvider,
          testModel,
          judgeProvider,
          judgeModel,
          judgeSystemPrompt,
          runId,
        )

        const finalWinRate =
          scoreState.attempts > 0 ? Math.round((scoreState.wins / scoreState.attempts) * 100) : 0
        addMessage(
          `✅ Batch run [${runId}] completed: ${scoreState.wins}/${scoreState.attempts} wins (${finalWinRate}% success rate)`,
          'success',
          'batch',
        )
      }
      if (action === 'test') {
        addMessage(`🧪 Starting manual test [${runId}] evaluation`, 'info', 'test')
        addMessage(`📝 Test Model: ${testModel} (${testProvider})`, 'info', 'test')
        addMessage(`🔍 Judge Model: ${judgeModel} (${judgeProvider})`, 'info', 'test')

        await addManualResponse(
          prompt,
          idealResponse,
          validatedJson,
          judgeProvider,
          judgeModel,
          judgeSystemPrompt,
          runId,
        )

        addMessage(
          `✅ Manual test [${runId}] completed. Check evaluation results below.`,
          'success',
          'test',
        )
      }
    } catch (error) {
      addMessage(`❌ Run [${runId}] failed: ${error.message}`, 'error', 'system')
    }
  }

  useEffect(() => {}, [runContext])

  useEffect(() => {
    if (llmConfigs && llmConfigs.length > 0 && !configLoading) {
      addMessage(
        `LLM configuration loaded. ${llmConfigs.length} provider(s) available.`,
        'success',
        'config',
      )

      // Set default models if none are selected
      if (!testModel) {
        const activeConfig = llmConfigs.find((c) => c.isActive) || llmConfigs[0]
        if (activeConfig) {
          setTestModel(activeConfig.defaultModel)

          setTestProvider(activeConfig.provider)
          addMessage(`Set default test model: ${activeConfig.defaultModel}`, 'info', 'config')
        }
      }
      if (!judgeModel) {
        const activeConfig = llmConfigs.find((c) => c.isActive) || llmConfigs[0]
        if (activeConfig) {
          setJudgeModel(activeConfig.defaultModel)

          setJudgeProvider(activeConfig.provider)
          addMessage(`Set default judge model: ${activeConfig.defaultModel}`, 'info', 'config')
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmConfigs, configLoading])

  useEffect(() => {
    if (configLoading) {
      addMessage('Loading LLM configuration...', 'info', 'config')
    }
  }, [configLoading, addMessage])

  return (
    <>
      <ActivityConsole configLoading={configLoading} llmConfigs={llmConfigs} />

      <Scoreboard isRunning={isRunning} scoreState={scoreState} />

      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Prompt Form</strong>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSubmit}>
                <LLMConfigSelector
                  llmConfigs={llmConfigs}
                  configLoading={configLoading}
                  testModel={testModel}
                  judgeModel={judgeModel}
                  onTestModelChange={handleTestModelChange}
                  onJudgeModelChange={handleJudgeModelChange}
                />

                <PromptFormFields
                  prompt={prompt}
                  idealResponse={idealResponse}
                  criteriaJson={criteriaJson}
                  judgeSystemPrompt={judgeSystemPrompt}
                  maxTry={maxTry}
                  isRunning={isRunning}
                  onPromptChange={setPrompt}
                  onIdealResponseChange={setIdealResponse}
                  onCriteriaJsonChange={setCriteriaJson}
                  onJudgeSystemPromptChange={setJudgeSystemPrompt}
                  onMaxTryChange={setMaxTry}
                  onJsonValid={handleJsonValid}
                />

                <CButton
                  className="m-2"
                  color="primary"
                  type="submit"
                  disabled={isRunning || configLoading}
                  name="action"
                  value="run"
                >
                  {isRunning ? 'Processing...' : 'Run'}
                </CButton>

                {isRunning && (
                  <CButton className="m-2" color="danger" onClick={cancelBatch}>
                    Cancel
                  </CButton>
                )}

                <CButton
                  className="m-2"
                  color="secondary"
                  onClick={resetResults}
                  disabled={isRunning}
                >
                  Reset Results
                </CButton>

                <CButton
                  className="m-2"
                  color="primary"
                  type="submit"
                  disabled={isRunning || configLoading}
                  name="action"
                  value="test"
                >
                  {isRunning ? 'Processing...' : 'Test Ideal'}
                </CButton>

                <CButton
                  className="m-2"
                  color="success"
                  onClick={handleExport}
                  disabled={isRunning || runContext.length === 0}
                >
                  Export .ipynb
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ResultsAccordion
        key={runContext.length}
        runContext={runContext}
        onReEvaluate={handleReEvaluate}
      />
    </>
  )
}

export default JsonPromptForm
