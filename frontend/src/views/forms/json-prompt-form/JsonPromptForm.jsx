import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CRow,
} from '@coreui/react'
import useLLM from '../../../hooks/useLLM'
import {
  LLMConfigSelector,
  PromptFormFields,
  StatusAlerts,
  ResultsAccordion,
  Scoreboard
} from './index'

const JsonPromptForm = () => {
  const [criteriaJson, setCriteriaJson] = useState('')
  const [idealResponse, setIdealResponse] = useState('')
  const [prompt, setPrompt] = useState('')
  const [validatedJson, setValidatedJson] = useState(null)
  const [maxTry, setMaxTry] = useState(20)
  const [judgeProvider, setJudgeProvider] = useState('')
  const [judgeModel, setJudgeModel] = useState('')
  const [testProvider, setTestProvider] = useState('')
  const [testModel, setTestModel] = useState('')

  // Use the LLM hook for all LLM-related functionality
   const {
    // State
    llmConfigs,
    configLoading,
    modelResponses,
    judgeParseResponses,
    judgeTextResponses,
    wins,
    attempts,
    isSubmitting,
    submitMessage,

    // Actions
    batch,
    addManualResponse,
    cancelBatch,
    resetResults,
  } = useLLM()

  // Event handlers
  const handleJsonValid = (parsedArray) => {
    setValidatedJson(parsedArray)
  }

  const handleTestProviderChange = (provider) => {
    setTestProvider(provider)
    setTestModel('') // Reset model when provider changes
  }

  const handleJudgeProviderChange = (provider) => {
    setJudgeProvider(provider)
    setJudgeModel('') // Reset model when provider changes
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    console.log(event)
    const action = event.nativeEvent.submitter.value
    if (action === "run") {
      await batch(prompt, validatedJson, maxTry, 4, testProvider, testModel, judgeProvider, judgeModel)
    }
    if (action === "test") {
      await addManualResponse(prompt, idealResponse, validatedJson, judgeProvider, judgeModel)
    }
  }

  useEffect(() => {
    console.log("model responses changed", modelResponses)
    console.log("model responses changed", judgeParseResponses)
  }, [modelResponses, judgeParseResponses])

  useEffect(() => {
    if (llmConfigs && llmConfigs.length > 0) {
      const activeConfig = llmConfigs.find(c => c.isActive) || llmConfigs[0]
      if (activeConfig) {
        if (!testProvider) setTestProvider(activeConfig.provider)
        if (!judgeProvider) setJudgeProvider(activeConfig.provider)
        if (!testModel && testProvider === activeConfig.provider) setTestModel(activeConfig.defaultModel)
        if (!judgeModel && judgeProvider === activeConfig.provider) setJudgeModel(activeConfig.defaultModel)
      }
    }
  }, [llmConfigs, testProvider, testModel, judgeProvider, judgeModel])

  return (
    <>
      <StatusAlerts
        configLoading={configLoading}
        llmConfigs={llmConfigs}
        submitMessage={submitMessage}
      />

      <Scoreboard
        attempts={attempts}
        wins={wins}
        isSubmitting={isSubmitting}
      />

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
                  testProvider={testProvider}
                  testModel={testModel}
                  judgeProvider={judgeProvider}
                  judgeModel={judgeModel}
                  onTestProviderChange={handleTestProviderChange}
                  onTestModelChange={setTestModel}
                  onJudgeProviderChange={handleJudgeProviderChange}
                  onJudgeModelChange={setJudgeModel}
                />

                <PromptFormFields
                  prompt={prompt}
                  idealResponse={idealResponse}
                  criteriaJson={criteriaJson}
                  maxTry={maxTry}
                  isSubmitting={isSubmitting}
                  onPromptChange={setPrompt}
                  onIdealResponseChange={setIdealResponse}
                  onCriteriaJsonChange={setCriteriaJson}
                  onMaxTryChange={setMaxTry}
                  onJsonValid={handleJsonValid}
                />

                <CButton className='m-2' color="primary" type="submit" disabled={isSubmitting || configLoading} name="action" value="run">
                  {isSubmitting ? 'Processing...' : 'Run'}
                </CButton>

                {isSubmitting && (
                  <CButton className='m-2' color="danger" onClick={cancelBatch}>
                    Cancel
                  </CButton>
                )}

                <CButton className='m-2' color="secondary" onClick={resetResults} disabled={isSubmitting}>
                  Reset Results
                </CButton>

                <CButton className='m-2' color="primary" type="submit" disabled={isSubmitting || configLoading} name="action" value="test">
                  {isSubmitting ? 'Processing...' : 'Test Ideal'}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <ResultsAccordion
        modelResponses={modelResponses}
        judgeParseResponses={judgeParseResponses}
        judgeTextResponses={judgeTextResponses}
      />
    </>
  )
}

export default JsonPromptForm
