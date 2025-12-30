import React, { useEffect, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CForm, CRow } from '@coreui/react'
import useLLM from '../../../hooks/useLLM'
import { useLog } from '../../../contexts/LogContext'
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
    modelResponses,
    judgeParseResponses,
    judgeTextResponses,
    scoreState,
    isSubmitting,
    generate,
    evaluate: evaluateResponse,
    score,
    run,
    batch,
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
          (progressMsg) => addMessage(progressMsg, 'info', 'test'),
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

  useEffect(() => {
    console.log('model responses changed', modelResponses)
    console.log('judge text responses changed', judgeTextResponses)
    console.log('judge parsed responses changed', judgeParseResponses)
  }, [modelResponses, judgeParseResponses, judgeTextResponses])

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
  }, [llmConfigs, configLoading, testModel, judgeModel])

  useEffect(() => {
    if (configLoading) {
      addMessage('Loading LLM configuration...', 'info', 'config')
    }
  }, [configLoading])

  return (
    <>
      <ActivityConsole configLoading={configLoading} llmConfigs={llmConfigs} />

      <Scoreboard isSubmitting={isSubmitting} scoreState={scoreState} />

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
                  isSubmitting={isSubmitting}
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
                  disabled={isSubmitting || configLoading}
                  name="action"
                  value="run"
                >
                  {isSubmitting ? 'Processing...' : 'Run'}
                </CButton>

                {isSubmitting && (
                  <CButton className="m-2" color="danger" onClick={cancelBatch}>
                    Cancel
                  </CButton>
                )}

                <CButton
                  className="m-2"
                  color="secondary"
                  onClick={resetResults}
                  disabled={isSubmitting}
                >
                  Reset Results
                </CButton>

                <CButton
                  className="m-2"
                  color="primary"
                  type="submit"
                  disabled={isSubmitting || configLoading}
                  name="action"
                  value="test"
                >
                  {isSubmitting ? 'Processing...' : 'Test Ideal'}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ResultsAccordion
        key={modelResponses.length}
        modelResponses={modelResponses}
        judgeParseResponses={judgeParseResponses}
        judgeTextResponses={judgeTextResponses}
      />
    </>
  )
}

export default JsonPromptForm
