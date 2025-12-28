import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormTextarea,
  CFormLabel,
  CRow,
  CAlert,
} from '@coreui/react'
import JsonArrayTextarea from 'src/components/JsonArrayTextarea'
import useLLM from '../../../hooks/useLLM'

const JsonPromptForm = () => {
  const [criteriaJson, setCriteriaJson] = useState('')
  const [prompt, setPrompt] = useState('')
  const [validatedJson, setValidatedJson] = useState(null)
  const [maxTry, setMaxTry] = useState(20)

  // Use the LLM hook for all LLM-related functionality
  const {
    llmConfig,
    configLoading,
    llmResponse,
    isSubmitting,
    submitMessage,
    submitPrompt,
    submitJudgeEvaluation,
    setSubmitMessage,
  } = useLLM()

  const handleJsonValid = (parsedArray) => {
    setValidatedJson(parsedArray)
  }

  const handlePromptSubmit = async (event) => {
    event.preventDefault()
    await submitPrompt(prompt)
  }

  const handleJudgeSubmit = async (event) => {
    event.preventDefault()
    await submitJudgeEvaluation(validatedJson, prompt, llmResponse, maxTry)
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          {/* LLM Configuration Status */}
          {configLoading ? (
            <CAlert color="info" className="mb-3">
              Loading LLM configuration...
            </CAlert>
          ) : llmConfig ? (
            <CAlert color="success" className="mb-3">
              Connected to {llmConfig.provider} ({llmConfig.defaultModel || 'default model'})
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
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Prompt Form</strong>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handlePromptSubmit}>
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

                {submitMessage && (
                  <CAlert
                    color={submitMessage.includes('Error') ? 'danger' : 'success'}
                    className="mb-3"
                  >
                    {submitMessage}
                  </CAlert>
                )}

                <CButton color="primary" type="submit" disabled={isSubmitting || configLoading}>
                  {isSubmitting ? 'Processing...' : 'Run Model'}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>JSON Criteria</strong>
            </CCardHeader>
            <CCardBody>
              <CForm onSubmit={handleJudgeSubmit}>
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

                {submitMessage && (
                  <CAlert
                    color={submitMessage.includes('Error') ? 'danger' : 'success'}
                    className="mb-3"
                  >
                    {submitMessage}
                  </CAlert>
                )}

                <CButton
                  color="primary"
                  type="submit"
                  disabled={isSubmitting || !validatedJson || configLoading || !llmResponse}
                >
                  {isSubmitting ? 'Processing...' : 'Start Evaluation'}
                </CButton>
              </CForm>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default JsonPromptForm
