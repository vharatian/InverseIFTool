import React, { useState, useEffect } from 'react'
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
import { configApi, llmService } from '../../../services'

const JsonPromptForm = () => {
  const [criteriaJson, setCriteriaJson] = useState('')
  const [prompt, setPrompt] = useState('')
  const [validatedJson, setValidatedJson] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [llmConfig, setLlmConfig] = useState(null)
  const [configLoading, setConfigLoading] = useState(true)

  // Fetch LLM configuration from backend on component mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await configApi.getActive()
        const config = response.data
        setLlmConfig(config)

        // Configure the LLM service with the fetched config
        try {
          llmService.configureProvider(config)
          console.log('LLM service configured with:', config)
        } catch (configError) {
          console.error('Failed to configure LLM service:', configError.message)
          setSubmitMessage(`Configuration Error: ${configError.message}`)
        }

        console.log('Fetched LLM config:', config)
      } catch (error) {
        console.warn('Could not fetch LLM config from backend:', error.message)
        // Fall back to client-side environment variables
        const fallbackConfig = {
          provider: 'openai',
          defaultModel: 'gpt-4o-mini',
          baseUrl: import.meta.env?.VITE_OPENAI_BASE_URL,
          apiKey: import.meta.env?.VITE_OPENAI_API_KEY,
        }

        setLlmConfig(fallbackConfig)

        try {
          llmService.configureProvider(fallbackConfig)
          console.log('LLM service configured with fallback config')
        } catch (configError) {
          console.error('Failed to configure LLM service with fallback:', configError.message)
        }
      } finally {
        setConfigLoading(false)
      }
    }

    fetchConfig()
  }, [])

  // Debug: Check if environment variables are accessible
  useEffect(() => {
    console.log('Environment check:', {
      VITE_OPENAI_API_KEY: import.meta.env?.VITE_OPENAI_API_KEY ? 'Set' : 'Not set',
      VITE_OPENAI_BASE_URL: import.meta.env?.VITE_OPENAI_BASE_URL,
      NODE_ENV: import.meta.env?.MODE,
    })
  }, [])

  const handleJsonValid = (parsedArray) => {
    setValidatedJson(parsedArray)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validatedJson) {
      setSubmitMessage('Please provide valid JSON criteria array')
      return
    }

    if (!prompt.trim()) {
      setSubmitMessage('Please provide a prompt')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      // Prepare the enhanced prompt with criteria
      const enhancedPrompt = `Using the following criteria: ${JSON.stringify(validatedJson)}\n\n${prompt}`

      console.log('Calling LLM with:', { criteria: validatedJson, prompt, enhancedPrompt })

      // Check if LLM service is configured
      if (!llmService.isConfigured()) {
        throw new Error('LLM service is not configured. Please check your provider settings.')
      }

      // Call the LLM using the configured service
      const response = await llmService.generateResponse(enhancedPrompt, {})

      setSubmitMessage(`LLM Response: ${response}`)
    } catch (error) {
      console.error('LLM call failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>JSON Criteria & Prompt Form</strong>
          </CCardHeader>
          <CCardBody>
            <CForm onSubmit={handleSubmit}>
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

              <div className="mb-3">
                <JsonArrayTextarea
                  label="Criteria JSON Array"
                  placeholder='Enter JSON array like: ["criterion1", "criterion2", "criterion3"]'
                  rows={8}
                  value={criteriaJson}
                  onChange={setCriteriaJson}
                  onValidJson={handleJsonValid}
                />
              </div>

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

              <CButton
                color="primary"
                type="submit"
                disabled={isSubmitting || !validatedJson || configLoading}
              >
                {isSubmitting ? 'Processing...' : 'Start Processing'}
              </CButton>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default JsonPromptForm
