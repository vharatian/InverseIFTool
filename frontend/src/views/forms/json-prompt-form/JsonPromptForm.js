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
  const [llmResponse, setLLMResponse] = useState(null)

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
          baseUrl: undefined,
          apiKey: '',
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
      NODE_ENV: import.meta.env?.MODE,
    })
  }, [])

  const handleJsonValid = (parsedArray) => {
    setValidatedJson(parsedArray)
  }

  const handlePromptSubmit = async (event) => {
    event.preventDefault()

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
      setLLMResponse(response)
    } catch (error) {
      console.error('LLM call failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJudgeSubmit = async (event) => {
    event.preventDefault()

    if (!validatedJson) {
      setSubmitMessage('Please provide valid JSON criteria array')
      return
    }

    if (!llmResponse) {
      setSubmitMessage('Please call the model first to generate a response')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      // Judge prompt template with placeholders
      const judgePromptTemplate = `:{prompt}

:{response_reference}

:{response}`

      // Response reference (the llmResponse from the first call)
      const responseReference = llmResponse

      // Judge system prompt
      const judgeSystemPrompt = `You are acting as a strict grading evaluator. Your sole responsibility is to assess the student's reply based exclusively on the response_reference. You must disregard intent, effort, or external knowledge. Literal compliance is the only metric for success.

STANDARD EVALUATION CRITERIA

Each criterion must be evaluated independently as PASS or FAIL: ${JSON.stringify(validatedJson)}

STRICT CRITERION EVALUATION RULES

Each criterion must be evaluated independently.

Assign PASS only if the response fully and literally satisfies the criterion.

Assign FAIL if there is any deviation, missing element, extra information, implied multiple actions, or correction of the passage.

Literal compliance is mandatory. Interpretation, assumption, or external knowledge is not allowed.

GRADING SCALE

For each response, assign exactly one score:

1 point (PASS)

0 points (FAIL)

Let:

N = total number of criteria (4)

P = number of criteria marked PASS

Scoring Rule:

P > N / 2 → 1 point (PASS)

P ≤ N / 2 → 0 points (FAIL)

Only the number of PASS criteria matters. Do not consider intent, inferred meaning, or partial correctness.

REQUIRED OUTPUT FORMAT

Your output must follow this exact sequence:

[Grading Basis]:

{"C1": "PASS or FAIL",

"C2": "PASS or FAIL",

"C3": "PASS or FAIL",

"C4": "PASS or FAIL"}

[Score]: X point(s)

[JSON]: {"answer_score": X}

[Explanation]: A brief statement explaining which criteria failed and why. If all passed, state "All criteria satisfied."

EVALUATION EXAMPLES

Example 1: Correct (1 point)

Student Answer:

Reboot

System

locked protocol seed

Login

Prompt

Script

Update

Monitor

Tools

[Grading Basis]:

{"C1": "PASS",

"C2": "PASS",

"C3": "PASS",

"C4": "PASS"}

[Score]: 1 point

[JSON]: {"answer_score": 1}

[Explanation]: All criteria are satisfied. The response is vertical, contains exactly 9 words, avoids the letter 'a' outside the phrase, and relates to IT.

Example 2: Incorrect (0 points - Multiple Failures)

Student Answer:

Password

locked

protocol

seed

Resetting

The

Database

Now

Support

Help

Tools

[Grading Basis]:

{"C1": "PASS",

"C2": "PASS",

"C3": "FAIL",

"C4": "FAIL"}

[Score]: 0 points

[JSON]: {"answer_score": 0}

[Explanation]: C3 failed because the letter 'a' is found in "Password" and "Database". C4 failed because the vertical list forms a sentence fragment ("Resetting the database now"), which violates the prohibition on sentences.

Example 3: Correct (1 point - Threshold Met)

Student Answer:

Login

User

locked

protocol

seed

Monitor

Script

Ping

Port

[Grading Basis]: {"C1": "PASS",

"C2": "PASS",

"C3": "PASS",

"C4": "FAIL"}

[Score]: 1 point

[JSON]: {"answer_score": 1}

[Explanation]: C4 failed because "User" and "Reset" are general terms, but because C1, C2, and C3 are fully satisfied, the score is 1 point (75% pass rate).

CLOSING STATEMENT

Remember, you must be very strict when grading the student's answer. Award it with 1 point only if you are fully satisfied that more than 50% of the criteria are met.`

      // Fill the judge prompt template
      const judgePrompt = judgePromptTemplate
        .replace(':{prompt}', prompt)
        .replace(':{response_reference}', responseReference)
        .replace(':{response}', llmResponse)

      console.log('Judge evaluation:', {
        criteria: validatedJson,
        originalPrompt: prompt,
        llmResponse: llmResponse,
        judgePrompt: judgePrompt,
      })

      // Check if LLM service is configured
      if (!llmService.isConfigured()) {
        throw new Error('LLM service is not configured. Please check your provider settings.')
      }

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

      // Call the LLM using the configured service with messages
      const judgeResponse = await llmService.generateResponseWithMessages(messages, {})

      setSubmitMessage(`Judge Evaluation:\n${judgeResponse}`)
    } catch (error) {
      console.error('Judge evaluation failed:', error)
      setSubmitMessage(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
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
