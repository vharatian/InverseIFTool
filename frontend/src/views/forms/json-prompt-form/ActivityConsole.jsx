import React, { useState, useEffect } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilTerminal } from '@coreui/icons'
import PropTypes from 'prop-types'
import { useLog } from '../../../contexts/LogContext'

/**
 * Activity console component for displaying system messages and logs
 * @param {Object} props - Component props
 * @param {boolean} props.configLoading - Whether LLM configurations are loading
 * @param {Array} props.llmConfigs - Array of LLM provider configurations
 */
const ActivityConsole = ({ configLoading, llmConfigs }) => {
  const { messages, clearMessages } = useLog()
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-expand when new messages arrive
  useEffect(() => {
    if (messages && messages.length > 0 && !isExpanded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExpanded(true)
    }
  }, [messages, isExpanded])

  const getMessageColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-danger'
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-warning'
      case 'info':
        return 'text-info'
      default:
        return 'text-muted'
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusMessage = () => {
    if (configLoading) {
      return { text: 'Loading LLM configuration...', type: 'info' }
    }
    if (llmConfigs && llmConfigs.length > 0) {
      return { text: `Connected to ${llmConfigs.length} LLM provider(s)`, type: 'success' }
    }
    return { text: 'Using fallback configuration (check backend connection)', type: 'warning' }
  }

  const statusMessage = getStatusMessage()

  return (
    <CRow className="mb-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader
            className="d-flex justify-content-between align-items-center"
            style={{ cursor: 'pointer' }}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="d-flex align-items-center">
              <CIcon icon={cilTerminal} className="me-2" />
              <strong>Activity Console</strong>
              <span
                className={`badge ms-2 ${statusMessage.type === 'success' ? 'bg-success' : statusMessage.type === 'warning' ? 'bg-warning' : statusMessage.type === 'error' ? 'bg-danger' : 'bg-info'}`}
              >
                {statusMessage.text}
              </span>
            </div>
            <div className="d-flex align-items-center">
              {messages && messages.length > 0 && (
                <span className="badge bg-secondary me-2">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}
                </span>
              )}
              <CButton
                size="sm"
                variant="ghost"
                color="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  onClearMessages()
                }}
                disabled={!messages || messages.length === 0}
                title="Clear console"
              >
                <CIcon icon={cilTrash} size="sm" />
              </CButton>
            </div>
          </CCardHeader>
          {isExpanded && (
            <CCardBody className="p-0">
              <div
                className="console-output"
                style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.25rem',
                  padding: '1rem',
                }}
              >
                {messages && messages.length > 0 ? (
                  messages.map((message, index) => (
                    <div key={index} className="mb-2">
                      <span className="text-muted">[{formatTimestamp(message.timestamp)}]</span>
                      <span className={`ms-2 ${getMessageColor(message.type)}`}>
                        {message.content}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted fst-italic">
                    No messages yet. Start a batch run or test to see activity here.
                  </div>
                )}
              </div>
            </CCardBody>
          )}
        </CCard>
      </CCol>
    </CRow>
  )
}

ActivityConsole.propTypes = {
  configLoading: PropTypes.bool,
  llmConfigs: PropTypes.arrayOf(
    PropTypes.shape({
      provider: PropTypes.string,
      isActive: PropTypes.bool,
    }),
  ),
}

export default ActivityConsole
