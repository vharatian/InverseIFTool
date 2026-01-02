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
import { useLog } from '../../../contexts/LogContext'
import ImportModal from '../../../components/ImportModal'
import ExportModal from '../../../components/ExportModal'
import {
  LLMConfigSelector,
  PromptFormFields,
  ActivityConsole,
  ResultsAccordion,
  Scoreboard,
} from './index'

const JsonPromptForm = () => {
  const [criteriaJson, setCriteriaJson] = useState(null)
  const [criteriaText, setCriteriaText] = useState('')
  const [idealResponse, setIdealResponse] = useState('')
  const [prompt, setPrompt] = useState('')
  const [judgeSystemPrompt, setJudgeSystemPrompt] = useState('')
  const [maxTry, setMaxTry] = useState(5)
  const [judgeModel, setJudgeModel] = useState('')
  const [testModel, setTestModel] = useState('')
  const [importedNotebook, setImportedNotebook] = useState(null)

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)

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


  const handleCriteriaChange = (c) => {
    setCriteriaText(c)
    try {
      const json = JSON.parse(c)
      setCriteriaJson(json)
    } catch (e) {
      console.log("not a valid json")
    }
  }


  const handleTestModelChange = (model) => {
    console.log("handle test model")
    setTestModel(model)
  }

  const handleJudgeModelChange = (model) => {
    setJudgeModel(model)
  }

  const handleReEvaluate = (responseItem) => {
    reEvaluate(responseItem, criteriaJson, prompt, judgeModel, judgeSystemPrompt)
  }

  const handleExport = () => {
    setShowExportModal(true)
  }


  const handleImportData = (importedData, notebookJson, source, sourceData) => {
    try {
      // Update form fields with imported data
      setImportedNotebook({ notebook: notebookJson, source, sourceData })
      if (importedData.userPrompt) {
        setPrompt(importedData.userPrompt)
      }
      if (importedData.idealResponse) {
        setIdealResponse(importedData.idealResponse)
      }
      if (importedData.criteria) {
        setCriteriaText(JSON.stringify(importedData.criteria, null, 2))
        setCriteriaJson(importedData.criteria)
      }
      if (importedData.judgeSystemPrompt) {
        setJudgeSystemPrompt(importedData.judgeSystemPrompt)
      }

      addMessage('✅ Notebook data imported successfully', 'success', 'import')
    } catch (error) {
      addMessage(`❌ Failed to import notebook data: ${error.message}`, 'error', 'import')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const action = event.nativeEvent.submitter.value

    // Generate unique run ID for this operation
    const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`

    try {
      if (action === 'run') {
        // Validate required fields
        if (!testModel) {
          console.error('Missing test model/provider')
          alert('Please select a test model and provider')
          addMessage('❌ Please select a test model and provider', 'error', 'system')
          return
        }
        if (!judgeModel) {
          console.error('Missing judge model/provider')
          alert('Please select a judge model and provider')
          addMessage('❌ Please select a judge model and provider', 'error', 'system')
          return
        }
        if (!criteriaJson) {
          console.error('Missing or invalid criteria')
          alert('Please provide valid evaluation criteria')
          addMessage('❌ Please provide valid evaluation criteria', 'error', 'system')
          return
        }

        addMessage(`🚀 Starting batch run [${runId}] with ${maxTry} attempts`, 'info', 'batch')
        addMessage(`📝 Test Model: ${testModel} `, 'info', 'batch')
        addMessage(`🔍 Judge Model: ${judgeModel} `, 'info', 'batch')
        addMessage(`🎯 Goal: 4 successful evaluations`, 'info', 'batch')

        await batch(
          prompt,
          criteriaJson,
          maxTry,
          4,
          testModel,
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
        addMessage(`📝 Test Model: ${testModel} `, 'info', 'test')
        addMessage(`🔍 Judge Model: ${judgeModel} `, 'info', 'test')

        await addManualResponse(
          prompt,
          idealResponse,
          criteriaJson,
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

  useEffect(() => { }, [runContext])

  useEffect(() => {
    ['test', 'judge'].forEach(agent => {
      const opt = llmConfigs[agent]?.filter(i => i.name = agent).at(0)
      if (opt) {
        console.log("find default opt for model", agent, opt)
        agent === 'test' && setTestModel(opt.option)
        agent === 'judge' && setJudgeModel(opt.option)
      }

    })
  }, [llmConfigs])


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
                  criteriaJson={criteriaText}
                  judgeSystemPrompt={judgeSystemPrompt}
                  maxTry={maxTry}
                  isRunning={isRunning}
                  onPromptChange={setPrompt}
                  onIdealResponseChange={setIdealResponse}
                  onCriteriaJsonChange={handleCriteriaChange}
                  onJudgeSystemPromptChange={setJudgeSystemPrompt}
                  onMaxTryChange={setMaxTry}
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
                // disabled={isRunning || runContext.length === 0}
                >
                  Export .ipynb
                </CButton>

                <CButton
                  className="m-2"
                  color="secondary"
                  onClick={() => setShowImportModal(true)}
                  disabled={isRunning}
                >
                  Import from .ipynb
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

      <ImportModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportData={handleImportData}
      />

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        importedNotebook={importedNotebook}
        formData={{
          userPrompt: prompt,
          idealResponse: idealResponse || undefined,
          criteria: criteriaJson || [],
          judgeSystemPrompt: judgeSystemPrompt,
          responses: runContext.map((item) => ({
            model: testModel || 'unknown_model',
            content: item.modelContent,
            judgeText: item.judgeText,
            isManual: item.modelContent === idealResponse,
          })),
        }}
      />
    </>
  )
}

export default JsonPromptForm
