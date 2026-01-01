import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CAlert,
  CFormCheck,
  CTabs,
  CTabList,
  CTab,
  CTabContent,
  CTabPanel,
} from '@coreui/react'
import { generateNotebookTemplate, updateNotebook } from '../utils/notebook'
import { googleDriveApi } from '../services'

const ExportModal = ({ visible, onClose, formData, importedNotebook }) => {
  const [exportFormat, setExportFormat] = useState('notebook')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedResponses, setSelectedResponses] = useState(new Set())
  const [activeTab, setActiveTab] = useState('file')
  const [fileNameInput, setFileNameInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [modelName, setModelName] = useState('')

  // Initialize selected responses when modal opens
  useEffect(() => {
    if (visible && formData.responses) {
      // Select all responses by default
      const allIndices = new Set(formData.responses.map((_, index) => index))
      setSelectedResponses(allIndices)
    }
  }, [visible, formData.responses])


  useEffect(() => {
    console.log("imported data detected", importedNotebook)
    if (importedNotebook) {
      importedNotebook.source && setActiveTab(importedNotebook.source)
      if (importedNotebook.sourceData && importedNotebook.source === 'file')
        setFileNameInput(importedNotebook.sourceData)
      if (importedNotebook.sourceData && importedNotebook.source === 'url') {
        setUrlInput(importedNotebook.sourceData)
      }
    }
  }, [importedNotebook])

  const handleResponseToggle = (index) => {
    const newSelected = new Set(selectedResponses)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedResponses(newSelected)
  }

  const handleSelectAll = () => {
    if (formData.responses) {
      const allIndices = new Set(formData.responses.map((_, index) => index))
      setSelectedResponses(allIndices)
    }
  }

  const handleSelectNone = () => {
    setSelectedResponses(new Set())
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Filter responses based on selection
      const filteredFormData = {
        ...formData,
        responses: formData.responses?.filter((_, index) => selectedResponses.has(index)) || [],
      }

      let notebookJson

      console.log("input formdata", formData)
      if (importedNotebook && exportFormat === 'notebook') {
        // Use updateNotebook to merge form data with original notebook
        notebookJson = updateNotebook(importedNotebook.notebook, filteredFormData)
        console.log("update notebookJson", notebookJson)
      } else {
        // Generate new notebook from scratch
        notebookJson = generateNotebookTemplate(filteredFormData)
        console.log("generate notebookJson", notebookJson)

      }

      const blob = new Blob([notebookJson], { type: 'application/json' })
      if (activeTab === 'file') {

        // Create blob and download
        const url = URL.createObjectURL(blob)

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
        const filename = fileNameInput
          ? `updated_evaluation_${timestamp}.ipynb`
          : `evaluation_${timestamp}.ipynb`

        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else if (activeTab === 'url') {
        googleDriveApi.updateFile(urlInput, blob, 'application/json')
      }

      // onClose()
    } catch (error) {
      console.error('Export failed:', error)
      // Could add error state here if needed
    } finally {
      setIsExporting(false)
    }
  }

  const getExportSummary = () => {
    const summary = []
    if (formData.userPrompt) summary.push('Prompt')
    if (formData.idealResponse) summary.push('Ideal Response')
    if (formData.criteria && formData.criteria.length > 0) {
      summary.push(`${formData.criteria.length} criteria`)
    }
    if (formData.judgeSystemPrompt) summary.push('Judge System Prompt')
    if (formData.responses && formData.responses.length > 0) {
      summary.push(`${selectedResponses.size}/${formData.responses.length} responses`)
    }
    return summary
  }



  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <strong>Export Evaluation</strong>
      </CModalHeader>
      <CModalBody>
        <CTabs activeItemKey={activeTab} onChange={setActiveTab}>
          <CTabList variant="underline-border">
            <CTab itemKey="file">Download File</CTab>
            <CTab itemKey="url">Upload</CTab>
          </CTabList>

          <CTabContent>
            <CTabPanel className="p-3" itemKey="file">
              <div className="mb-3">
                <CFormLabel htmlFor="notebookFileName">File Name</CFormLabel>
                <CFormInput
                  type="text"
                  id="notebookFilename"
                  accept=".ipynb"
                  value={fileNameInput}
                  onChange={(e) => setFileNameInput(e.target.value)}
                />
              </div>
            </CTabPanel>

            <CTabPanel className="p-3" itemKey="url">
              <div className="mb-3">
                <CFormLabel htmlFor="notebookUrl">Notebook URL</CFormLabel>
                <CFormInput
                  type="text"
                  id="notebookUrl"
                  placeholder="https://drive.google.com/file/d/... or https://colab.research.google.com/drive/..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <small className="text-muted">URL import coming soon</small>
              </div>
            </CTabPanel>

          </CTabContent>
        </CTabs>

        <div className="mb-3">
          <CFormLabel>Export Format</CFormLabel>
          <div className="d-flex gap-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="exportFormat"
                id="notebookFormat"
                value="notebook"
                checked={exportFormat === 'notebook'}
                onChange={(e) => setExportFormat(e.target.value)}
              />
              <label className="form-check-label" htmlFor="notebookFormat">
                Jupyter Notebook (.ipynb)
              </label>
            </div>
          </div>
        </div>

        {formData.responses && formData.responses.length > 0 && (
          <div className="mb-3">
            <CFormLabel>Select Responses to Export</CFormLabel>
            <div className="mb-2">
              <CButton size="sm" color="outline-primary" className="me-2" onClick={handleSelectAll}>
                Select All
              </CButton>
              <CButton size="sm" color="outline-secondary" onClick={handleSelectNone}>
                Select None
              </CButton>
            </div>
            <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {formData.responses.map((response, index) => (
                <div key={index} className="mb-2">
                  <CFormCheck
                    id={`response-${index}`}
                    label={
                      <div>
                        <strong>{response.model || 'Unknown Model'}</strong>
                        <br />
                        <small className="text-muted">
                          {response.content?.substring(0, 100)}
                          {response.content?.length > 100 ? '...' : ''}
                        </small>
                        {response.judgeText && (
                          <div className="text-success">
                            <small>✓ Has evaluation</small>
                          </div>
                        )}
                      </div>
                    }
                    checked={selectedResponses.has(index)}
                    onChange={() => handleResponseToggle(index)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <CAlert color="info">
          <strong>Export Summary:</strong>
          <br />
          {getExportSummary().join(', ')}
          {importedNotebook && (
            <>
              <br />
              <em>Will update existing notebook structure</em>
            </>
          )}
        </CAlert>

        {importedNotebook && (
          <CAlert color="warning">
            <strong>Note:</strong> Exporting will preserve the original notebook structure and
            update/modify existing sections with current form data.
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="success" onClick={handleExport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export Notebook'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ExportModal
