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
  * @param {Array<{id: string, runId: string, status?: 'generating' | 'evaluating' | 'parsing' | 'scoring' | 'completed' | 'error', modelContent?: string, modelReasoning?: string, judgeText?: string, judgeReasoning?: string, gradingBasis?: Object, score?: number, json?: any, explanation?: string, error?: string}>} props.runContext - Array of flattened run context objects containing all response data
 * @param {Function} props.onReEvaluate - Function to re-evaluate a response
 */
const ResultsAccordion = ({ runContext, onReEvaluate }) => {
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
                    </CBadge>
                  ))}
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
                    <CTab itemKey="model-reasoning" disabled={!context.modelReasoning}>
                      Reasoning
                    </CTab>
                    <CTab itemKey="evaluation" disabled={!context.judgeText}>
                      Evaluation
                    </CTab>
                     <CTab itemKey="judge-reasoning" disabled={!context.judgeReasoning}>
                       Judge Reasoning
                     </CTab>
                     <CTab itemKey="error" disabled={!context.error}>
                       Error
                     </CTab>
                   </CTabList>
                  <CTabContent>
                    <CTabPanel className="p-3" itemKey="response">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Model Response</small>
                        </div>
                        <div className="d-flex gap-2">
                          <CButton
                            size="sm"
                            color="warning"
                            onClick={() => onReEvaluate(context)}
                            disabled={context.status === 'evaluating' || !context.modelContent}
                            title="Re-evaluate this response"
                          >
                            Re-evaluate
                          </CButton>
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
                            {copiedItems.has(`${context.id}-response`) ? 'Copied!' : 'Copied!'}
                          </CButton>
                        </div>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {context.modelContent}
                      </div>
                    </CTabPanel>
                    <CTabPanel className="p-3" itemKey="model-reasoning">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Model Reasoning Process</small>
                        </div>
                        <CButton
                          size="sm"
                          color={
                            copiedItems.has(`${context.id}-model-reasoning`) ? 'success' : 'secondary'
                          }
                          onClick={() =>
                            copyToClipboard(context.modelReasoning || '', context.id, 'model-reasoning')
                          }
                          disabled={!context.modelReasoning}
                          title="Copy reasoning to clipboard"
                        >
                          <CIcon icon={cilCopy} size="sm" className="me-1" />
                          {copiedItems.has(`${context.id}-model-reasoning`) ? 'Copied!' : 'Copy'}
                        </CButton>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace', fontSize: '0.9em' }}>
                        {context.modelReasoning || 'No reasoning data available'}
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
                    <CTabPanel className="p-3" itemKey="judge-reasoning">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Judge Reasoning Process</small>
                        </div>
                        <CButton
                          size="sm"
                          color={
                            copiedItems.has(`${context.id}-judge-reasoning`) ? 'success' : 'secondary'
                          }
                          onClick={() =>
                            copyToClipboard(context.judgeReasoning || '', context.id, 'judge-reasoning')
                          }
                          disabled={!context.judgeReasoning}
                          title="Copy reasoning to clipboard"
                        >
                          <CIcon icon={cilCopy} size="sm" className="me-1" />
                          {copiedItems.has(`${context.id}-judge-reasoning`) ? 'Copied!' : 'Copy'}
                        </CButton>
                      </div>
                       <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'monospace', fontSize: '0.9em' }}>
                         {context.judgeReasoning || 'No reasoning data available'}
                       </div>
                     </CTabPanel>
                     <CTabPanel className="p-3" itemKey="error">
                       <div className="d-flex justify-content-between align-items-start mb-2">
                         <div className="flex-grow-1 me-2">
                           <small className="text-muted">Error Details</small>
                         </div>
                         <CButton
                           size="sm"
                           color={
                             copiedItems.has(`${context.id}-error`) ? 'success' : 'secondary'
                           }
                           onClick={() =>
                             copyToClipboard(context.error || '', context.id, 'error')
                           }
                           disabled={!context.error}
                           title="Copy error to clipboard"
                         >
                           <CIcon icon={cilCopy} size="sm" className="me-1" />
                           {copiedItems.has(`${context.id}-error`) ? 'Copied!' : 'Copy'}
                         </CButton>
                       </div>
                       <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', color: 'red' }}>
                         {context.error || 'No error details available'}
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
      modelReasoning: PropTypes.string,
      judgeText: PropTypes.string,
      judgeReasoning: PropTypes.string,
      gradingBasis: PropTypes.object,
      score: PropTypes.number,
       json: PropTypes.any,
       explanation: PropTypes.string,
       error: PropTypes.string,
     }),
  ).isRequired,
  onReEvaluate: PropTypes.func.isRequired,
}

export default ResultsAccordion
