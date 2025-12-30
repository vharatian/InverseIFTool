import React, { useEffect, useState, useMemo } from 'react'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CBadge,
  CButton,
  CRow,
  CTab,
  CTabContent,
  CTabList,
  CTabPanel,
  CTabs,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCopy } from '@coreui/icons'
import PropTypes from 'prop-types'

/**
 * Component for displaying model responses and evaluations in an accordion
 * @param {Object} props - Component props
 * @param {Array<{id: string, runId: string, status?: 'generating' | 'evaluating' | 'parsing' | 'scoring' | 'completed' | 'error', modelContent?: string, judgeText?: string, gradingBasis?: Object, score?: number, json?: any, explanation?: string}>} props.runContext - Array of flattened run context objects containing all response data
 */
const ResultsAccordion = ({ runContext }) => {
  const [copiedItems, setCopiedItems] = useState(new Set())

  // Filter to only show contexts that have model responses
  const filteredRunContext = runContext.filter((context) => context.modelContent)

  if (filteredRunContext.length === 0) {
    return null
  }

  const copyToClipboard = async (content, itemId, type) => {
    try {
      await navigator.clipboard.writeText(content)
      const copyId = `${itemId}-${type}`
      setCopiedItems((prev) => new Set([...prev, copyId]))

      // Remove the "copied" state after 2 seconds
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev)
          newSet.delete(copyId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Create a human-readable ID from the response ID and index
  const getReadableId = (response, index) => {
    // Extract timestamp from ID format: response_{timestamp}_{random}
    const idParts = response.id.split('_')
    if (idParts.length >= 2) {
      try {
        const timestamp = parseInt(idParts[1])
        const time = new Date(timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        const runDisplay = response.runId ? `[${response.runId.split('_')[1]}] ` : ''
        return `Run ${runDisplay}`
      } catch (e) {
        // Fallback if timestamp parsing fails
      }
    }
    const runDisplay = response.runId ? `[${response.runId.split('_')[1]}] ` : ''
    return `Run ${runDisplay}`
  }

  return (
    <CRow>
      <CAccordion activeItemKey={1} className="mb-5">
        {filteredRunContext.map((context, index) => {
          return (
            <CAccordionItem itemKey={index + 1} key={context.id}>
              <CAccordionHeader>
                <strong style={{ marginRight: '10px' }}>
                  {getReadableId({ id: context.id, runId: context.runId }, index)}
                </strong>
                <CBadge
                  style={{ marginRight: '10px' }}
                  color={
                    context.status === 'completed'
                      ? 'success'
                      : context.status === 'error'
                        ? 'danger'
                        : context.status === 'generating'
                          ? 'primary'
                          : context.status === 'evaluating'
                            ? 'warning'
                            : context.status === 'parsing'
                              ? 'info'
                              : context.status === 'scoring'
                                ? 'secondary'
                                : 'light'
                  }
                >
                  {context.status || 'unknown'}
                </CBadge>
                {context.gradingBasis &&
                  Object.keys(context.gradingBasis).map((key) => (
                    <CBadge
                      key={key}
                      style={{ marginRight: '10px' }}
                      color={context.gradingBasis[key] !== 'FAIL' ? 'success' : 'danger'}
                    >
                      {key}
                    </CBadge>)
                  )
                }
                {context.score != undefined && (
                  <CBadge
                    style={{ marginRight: '10px' }}
                    color={context.score !== 0 ? 'success' : 'danger'}
                  >
                    score
                  </CBadge>
                )}
              </CAccordionHeader>
              <CAccordionBody>
                <CTabs defaultActiveItemKey="response">
                  <CTabList variant="tabs">
                    <CTab itemKey="response">Response</CTab>
                    <CTab itemKey="evaluation" disabled={!context.judgeText}>
                      Evaluation
                    </CTab>
                  </CTabList>
                  <CTabContent>
                    <CTabPanel className="p-3" itemKey="response">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Model Response</small>
                        </div>
                        <CButton
                          size="sm"
                          color={
                            copiedItems.has(`${context.id}-response`) ? 'success' : 'secondary'
                          }
                          onClick={() =>
                            copyToClipboard(context.modelContent, context.id, 'response')
                          }
                          title="Copy response to clipboard"
                        >
                          <CIcon icon={cilCopy} size="sm" className="me-1" />
                          {copiedItems.has(`${context.id}-response`) ? 'Copied!' : 'Copy'}
                        </CButton>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {context.modelContent}
                      </div>
                    </CTabPanel>
                    <CTabPanel className="p-3" itemKey="evaluation">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Judge Evaluation</small>
                        </div>
                        <CButton
                          size="sm"
                          color={
                            copiedItems.has(`${context.id}-evaluation`) ? 'success' : 'secondary'
                          }
                          onClick={() =>
                            copyToClipboard(context.judgeText || '', context.id, 'evaluation')
                          }
                          disabled={!context.judgeText}
                          title="Copy evaluation to clipboard"
                        >
                          <CIcon icon={cilCopy} size="sm" className="me-1" />
                          {copiedItems.has(`${context.id}-evaluation`) ? 'Copied!' : 'Copy'}
                        </CButton>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {context.judgeText || 'No evaluation available'}
                      </div>
                    </CTabPanel>
                  </CTabContent>
                </CTabs>
              </CAccordionBody>
            </CAccordionItem>
          )
        })}
      </CAccordion>
    </CRow>
  )
}

ResultsAccordion.propTypes = {
  runContext: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      runId: PropTypes.string.isRequired,
      status: PropTypes.oneOf([
        'generating',
        'evaluating',
        'parsing',
        'scoring',
        'completed',
        'error',
      ]),
      modelContent: PropTypes.string,
      judgeText: PropTypes.string,
      gradingBasis: PropTypes.object,
      score: PropTypes.number,
      json: PropTypes.any,
      explanation: PropTypes.string,
    }),
  ).isRequired,
}

export default ResultsAccordion
