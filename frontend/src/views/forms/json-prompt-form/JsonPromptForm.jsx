import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormTextarea,
  CFormLabel,
  CFormSelect,
  CRow,
  CAlert,
  CAccordion, CAccordionBody, CAccordionHeader, CAccordionItem, CBadge,
  CTab, CTabContent, CTabList, CTabPanel, CTabs
} from '@coreui/react'
import JsonArrayTextarea from 'src/components/JsonArrayTextarea'
import useLLM from '../../../hooks/useLLM'

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

  const handleJsonValid = (parsedArray) => {
    setValidatedJson(parsedArray)
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
      <CRow>
        <CCol xs={12}>
          {/* LLM Configuration Status */}
          {configLoading ? (
            <CAlert color="info" className="mb-3">
              Loading LLM configuration...
            </CAlert>
          ) : llmConfigs && llmConfigs.length > 0 ? (
            <CAlert color="success" className="mb-3">
              Connected to {llmConfigs.length} LLM provider(s)
            </CAlert>
          ) : (
            <CAlert color="warning" className="mb-3">
              Using fallback configuration (check backend connection)
            </CAlert>
          )}
        </CCol>
      </CRow>
      <CRow>
        <CCol xs={12}>
          {submitMessage && (
            <CAlert
              color={submitMessage.includes('Error') ? 'danger' : 'success'}
              className="mb-3"
            >
              {submitMessage}
            </CAlert>
          )}
        </CCol>
      </CRow>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Prompt Form</strong>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleSubmit}>
                <CRow>
                  <CCol md={3}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="testProviderSelect">Test Provider</CFormLabel>
                      <CFormSelect
                        id="testProviderSelect"
                        value={testProvider}
                        onChange={(e) => {
                          setTestProvider(e.target.value)
                          setTestModel('')
                        }}
                        disabled={configLoading}
                      >
                        <option value="">Select Provider</option>
                        {llmConfigs?.map((config) => (
                          <option key={config.provider} value={config.provider}>
                            {config.provider}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={3}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="testModelSelect">Test Model</CFormLabel>
                      <CFormSelect
                        id="testModelSelect"
                        value={testModel}
                        onChange={(e) => setTestModel(e.target.value)}
                        disabled={configLoading || !testProvider}
                      >
                        <option value="">Select Model</option>
                        {llmConfigs?.find(c => c.provider === testProvider)?.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={3}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="judgeProviderSelect">Judge Provider</CFormLabel>
                      <CFormSelect
                        id="judgeProviderSelect"
                        value={judgeProvider}
                        onChange={(e) => {
                          setJudgeProvider(e.target.value)
                          setJudgeModel('')
                        }}
                        disabled={configLoading}
                      >
                        <option value="">Select Provider</option>
                        {llmConfigs?.map((config) => (
                          <option key={config.provider} value={config.provider}>
                            {config.provider}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={3}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="judgeModelSelect">Judge Model</CFormLabel>
                      <CFormSelect
                        id="judgeModelSelect"
                        value={judgeModel}
                        onChange={(e) => setJudgeModel(e.target.value)}
                        disabled={configLoading || !judgeProvider}
                      >
                        <option value="">Select Model</option>
                        {llmConfigs?.find(c => c.provider === judgeProvider)?.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </CFormSelect>
                    </div>
                  </CCol>
                </CRow>
                <div className="mb-3">
                  <CFormLabel htmlFor="promptTextarea">Prompt</CFormLabel>
                  <CFormTextarea
                    id="promptTextarea"
                    rows={6}
                    placeholder="Enter your prompt here..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <CFormLabel htmlFor="promptTextarea">Ideal Response</CFormLabel>
                  <CFormTextarea
                    id="idealTextarea"
                    rows={6}
                    placeholder="Enter your idealResponse here..."
                    value={idealResponse}
                    onChange={(e) => setIdealResponse(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <JsonArrayTextarea
                    label="Criteria JSON Array"
                    placeholder='Enter JSON array like: ["criterion1", "criterion2", "criterion3"]'
                    rows={8}
                    value={criteriaJson}
                    onChange={setCriteriaJson}
                    onValidJson={handleJsonValid}
                  />
                  <div className="mb-3">
                    <CFormLabel htmlFor="maxTryInput">Max Attempts (default: 20)</CFormLabel>
                    <input
                      type="number"
                      id="maxTryInput"
                      className="form-control"
                      value={maxTry}
                      onChange={(e) =>
                        setMaxTry(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))
                      }
                      min="1"
                      max="100"
                      disabled={isSubmitting}
                    />
                    <small className="form-text text-muted">
                      Maximum number of evaluation attempts (1-100)
                    </small>
                  </div>
                </div>



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
      {modelResponses && modelResponses.length > 0 && < CRow >
        <CAccordion activeItemKey={1}>
          {modelResponses.map((res, index) => {
            return (<CAccordionItem itemKey={index + 1}>
              <CAccordionHeader>

                <strong style={{ marginRight: "10px" }}> Response {index + 1} </strong>
                {judgeParseResponses.at(index) && Object.keys(judgeParseResponses.at(index).gradingBasis).map(key => {
                  return <CBadge style={{ marginRight: "10px" }} color={judgeParseResponses.at(index).gradingBasis[key] !== "FAIL" ? "success" : "danger"}>{key}</CBadge>
                })}
                {judgeParseResponses.at(index) && <CBadge style={{ marginRight: "10px" }} color={judgeParseResponses.at(index).score !== 0 ? "success" : "danger"}>score</CBadge>}

              </CAccordionHeader>
              <CAccordionBody>
                <CTabs defaultActiveItemKey="response">
                  <CTabList variant="tabs">
                    <CTab itemKey="response">Response</CTab>
                    <CTab itemKey="evaluation" disabled={!judgeTextResponses.at(index)}>Evaluation</CTab>
                  </CTabList>
                  <CTabContent>
                    <CTabPanel className="p-3" itemKey="response">
                      {res}
                    </CTabPanel>
                    <CTabPanel className="p-3" itemKey="evaluation">
                      {judgeTextResponses.at(index)}
                    </CTabPanel>
                  </CTabContent>
                </CTabs>
              </CAccordionBody>
            </CAccordionItem>
            )
          })}
        </CAccordion >
      </CRow >}
    </>
  )
}

export default JsonPromptForm
