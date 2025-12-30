import React, { useState } from 'react'
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
 * @param {Array<{id: string, content: string}>} props.modelResponses - Array of model response objects with id and content
 * @param {Array<{id: string, gradingBasis: Object, score: number}>} props.judgeParseResponses - Array of parsed judge responses with id
 * @param {Array<{id: string, content: string}>} props.judgeTextResponses - Array of raw judge response objects with id
 */
const ResultsAccordion = ({
  modelResponses,
  judgeParseResponses,
  judgeTextResponses,
}) => {
  const [copiedItems, setCopiedItems] = useState(new Set())

  if (!modelResponses || modelResponses.length === 0) {
    return null
  }

  const copyToClipboard = async (content, itemId, type) => {
    try {
      await navigator.clipboard.writeText(content)
      const copyId = `${itemId}-${type}`
      setCopiedItems(prev => new Set([...prev, copyId]))

      // Remove the "copied" state after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(copyId)
          return newSet
        })
      }, 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <CRow>
      <CAccordion activeItemKey={1}>
        {modelResponses.map((res, index) => {
          // Find matching judge responses by ID
          const judgeParsed = judgeParseResponses.find(j => j.id === res.id)
          const judgeText = judgeTextResponses.find(j => j.id === res.id)

          return (
            <CAccordionItem itemKey={index + 1} key={res.id}>
              <CAccordionHeader>
                <strong style={{ marginRight: "10px" }}>Response {index + 1}</strong>
                {judgeParsed && judgeParsed.gradingBasis ?
                  Object.keys(judgeParsed.gradingBasis).map(key => (
                    <CBadge
                      key={key}
                      style={{ marginRight: "10px" }}
                      color={judgeParsed.gradingBasis[key] !== "FAIL" ? "success" : "danger"}
                    >
                      {key}
                    </CBadge>
                  )) : <CBadge
                    style={{ marginRight: "10px" }}
                    color="danger"
                  >
                    Parse Failed
                  </CBadge>

                }
                {judgeParsed && judgeParsed.score != undefined &&
                  <CBadge
                    style={{ marginRight: "10px" }}
                    color={judgeParsed.score !== 0 ? "success" : "danger"}
                  >
                    score
                  </CBadge>
                }
              </CAccordionHeader>
              <CAccordionBody>
                <CTabs defaultActiveItemKey="response">
                  <CTabList variant="tabs">
                    <CTab itemKey="response">Response</CTab>
                    <CTab itemKey="evaluation" disabled={!judgeText}>Evaluation</CTab>
                  </CTabList>
                  <CTabContent>
                    <CTabPanel className="p-3" itemKey="response">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Model Response</small>
                        </div>
                        <CButton
                          size="sm"
                          color={copiedItems.has(`${res.id}-response`) ? "success" : "secondary"}
                          onClick={() => copyToClipboard(res.content, res.id, 'response')}
                          title="Copy response to clipboard"
                        >
                          <CIcon icon={cilCopy} size="sm" className="me-1" />
                          {copiedItems.has(`${res.id}-response`) ? 'Copied!' : 'Copy'}
                        </CButton>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {res.content}
                      </div>
                    </CTabPanel>
                    <CTabPanel className="p-3" itemKey="evaluation">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1 me-2">
                          <small className="text-muted">Judge Evaluation</small>
                        </div>
                        <CButton
                          size="sm"
                          color={copiedItems.has(`${res.id}-evaluation`) ? "success" : "secondary"}
                          onClick={() => copyToClipboard(judgeText?.content || '', res.id, 'evaluation')}
                          disabled={!judgeText}
                          title="Copy evaluation to clipboard"
                        >
                          <CIcon icon={cilCopy} size="sm" className="me-1" />
                          {copiedItems.has(`${res.id}-evaluation`) ? 'Copied!' : 'Copy'}
                        </CButton>
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {judgeText?.content || 'No evaluation available'}
                      </div>
                    </CTabPanel>
                  </CTabContent>
                </CTabs>
              </CAccordionBody>
            </CAccordionItem>
          )
        })}
      </CAccordion>
    </CRow >
  )
}

ResultsAccordion.propTypes = {
  modelResponses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  })),
  judgeParseResponses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    gradingBasis: PropTypes.object,
    score: PropTypes.number,
  })),
  judgeTextResponses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  })),
}

export default ResultsAccordion
