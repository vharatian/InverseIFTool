import React, { useState } from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CFormLabel,
  CAlert,
  CTabs,
  CTabList,
  CTab,
  CTabContent,
  CTabPanel,
  CFormTextarea,
} from '@coreui/react'
import { parseNotebook, extractFormData, updateNotebook } from '../utils/notebook'
import { googleDriveApi } from '../services/api'

const ImportModal = ({ visible, onClose, onImportData }) => {
  const [activeTab, setActiveTab] = useState('file')
  const [selectedFile, setSelectedFile] = useState(null)
  const [urlInput, setUrlInput] = useState('')
  const [validationMessages, setValidationMessages] = useState([])
  const [isValidating, setIsValidating] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [notebookJson, setNotebookJson] = useState(null)

  const resetModal = () => {
    setSelectedFile(null)
    setUrlInput('')
    setValidationMessages([])
    setParsedData(null)
    setIsValidating(false)
    setNotebookJson(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.name.endsWith('.ipynb')) {
        setSelectedFile(file)
        setValidationMessages([])
      } else {
        setValidationMessages(['❌ Please select a valid .ipynb file'])
        setSelectedFile(null)
      }
    }
  }

  const handleValidate = async () => {
    setIsValidating(true)
    setValidationMessages([])
    setParsedData(null)
    setNotebookJson(null)

    try {
      let _notebookJson

      if (activeTab === 'file' && selectedFile) {
        _notebookJson = await parseNotebook(selectedFile)
      } else if (activeTab === 'url' && urlInput.trim()) {
        // For URL, we'll need to implement download logic
        // For now, show a message that URL import is not implemented
        const text = await handleGoogleDriveDownload(urlInput.trim())
        _notebookJson = await parseNotebook(text)
      } else {
        throw new Error('Please provide input based on selected tab')
      }

      setNotebookJson(_notebookJson)
      // Extract form data
      const result = extractFormData(notebookJson)

      if (result.success) {
        setParsedData(result.data)
        const messages = ['✅ Notebook parsed successfully!']

        // Add summary of extracted data
        const summary = []
        if (result.data.userPrompt) summary.push('Prompt')
        if (result.data.idealResponse) summary.push('Ideal Response')
        if (result.data.criteria && result.data.criteria.length > 0) {
          summary.push(`${result.data.criteria.length} criteria`)
        }
        if (result.data.judgeSystemPrompt) summary.push('Judge System Prompt')

        if (summary.length > 0) {
          messages.push(`📋 Extracted: ${summary.join(', ')}`)
        }

        // Add warnings if any
        if (result.errors.length > 0) {
          messages.push('⚠️ Warnings:')
          result.errors.forEach((warning) => {
            messages.push(`   ${warning}`)
          })
        }

        messages.push('Ready to import!')
        setValidationMessages(messages)
      } else {
        setValidationMessages(result.errors.map((err) => `❌ ${err}`))
      }
    } catch (error) {
      setValidationMessages([`❌ ${error.message}`])
    } finally {
      setIsValidating(false)
    }
  }

  const handleImport = () => {
    if (parsedData && onImportData) {
      onImportData(parsedData, notebookJson, activeTab, activeTab === 'url' ? urlInput : selectedFile.name)
      handleClose()
    }
  }

  const canValidate = () => {
    switch (activeTab) {
      case 'file':
        return selectedFile !== null
      case 'url':
        return urlInput.trim().length > 0
      case 'json':
        return jsonInput.trim().length > 0
      default:
        return false
    }
  }

  const handleGoogleDriveDownload = async () => {
    if (!urlInput.trim()) {
      setValidationMessages('❌ Please enter a Google Drive URL or file ID', 'error', 'google-drive')
      return
    }

    try {
      const response = await googleDriveApi.downloadFile(urlInput.trim())

      // Convert blob to text for console logging
      const textContent = await response.data.text()

      console.log('Google Drive File Content:', textContent)

      // Close modal and reset URL
      return textContent
    } catch (error) {
      console.error('Google Drive download error:', error)
      addMessage(
        `❌ Failed to download file: ${error.response?.data?.message || error.message}`,
        'error',
        'google-drive',
      )
    }
  }

  return (
    <CModal visible={visible} onClose={handleClose} alignment="center" size="lg">
      <CModalHeader>
        <strong>Import Jupyter Notebook</strong>
      </CModalHeader>
      <CModalBody>
        <CTabs activeItemKey={activeTab} onChange={setActiveTab}>
          <CTabList variant="underline-border">
            <CTab itemKey="file">Upload File</CTab>
            <CTab itemKey="url">From URL</CTab>
          </CTabList>

          <CTabContent>
            <CTabPanel className="p-3" itemKey="file">
              <div className="mb-3">
                <CFormLabel htmlFor="notebookFile">Select .ipynb file</CFormLabel>
                <CFormInput
                  type="file"
                  id="notebookFile"
                  accept=".ipynb"
                  onChange={handleFileSelect}
                />
                {selectedFile && (
                  <small className="text-muted">Selected: {selectedFile.name}</small>
                )}
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

        {validationMessages.length > 0 && (
          <CAlert
            color={
              validationMessages.some((msg) => msg.includes('❌'))
                ? 'danger'
                : validationMessages.some((msg) => msg.includes('⚠️'))
                  ? 'warning'
                  : 'success'
            }
          >
            {validationMessages.map((message, index) => (
              <div key={index}>{message}</div>
            ))}
          </CAlert>
        )}

        {parsedData && (
          <CAlert color="info">
            <strong>Preview:</strong>
            <br />
            Prompt: {parsedData.userPrompt ? '✅' : '❌'} | Ideal Response:{' '}
            {parsedData.idealResponse ? '✅' : '❌'} | Criteria:{' '}
            {parsedData.criteria ? parsedData.criteria.length : 0} | Judge Prompt:{' '}
            {parsedData.judgeSystemPrompt ? '✅' : '❌'}
          </CAlert>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" onClick={handleClose}>
          Cancel
        </CButton>
        <CButton color="warning" onClick={handleValidate} disabled={!canValidate() || isValidating}>
          {isValidating ? 'Validating...' : 'Validate'}
        </CButton>
        <CButton color="primary" onClick={handleImport} disabled={!parsedData}>
          Import Data
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ImportModal
