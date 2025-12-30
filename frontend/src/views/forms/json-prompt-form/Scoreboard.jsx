import React, { useEffect, useState } from 'react'
import { CProgress, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import PropTypes from 'prop-types'

/**
 * Component for displaying batch run statistics and scoreboard
 * @param {Object} props - Component props
 * @param {boolean} props.isSubmitting - Whether a batch is currently running
 * @param {Object} props.scoreState - Score state with batch result
 */
const Scoreboard = ({ isSubmitting, scoreState }) => {
  const winRate =
    scoreState.attempts > 0 ? Math.round((scoreState.wins / scoreState.attempts) * 100) : 0
  const lossRate = scoreState.attempts > 0 ? 100 - winRate : 0

  // Compute batch analysis from criteriaStats
  const criteriaNames = Object.keys(scoreState.criteriaStats)
  const totalCriteria = criteriaNames.length
  const diverseCriteria = criteriaNames.filter(
    (name) => scoreState.criteriaStats[name].pass > 0 && scoreState.criteriaStats[name].fail > 0,
  ).length
  const requiredDiversity = Math.ceil(totalCriteria / 2)
  const batchWin = diverseCriteria >= requiredDiversity

  return (
    <CRow className="mb-4">
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>Batch Run Scoreboard</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="text-center">
              <CCol md={3}>
                <div className="h3 text-primary">{scoreState.attempts}</div>
                <div className="text-muted">Total Attempts</div>
              </CCol>
              <CCol md={3}>
                <div className="h3 text-success">{scoreState.wins}</div>
                <div className="text-muted">Wins</div>
              </CCol>
              <CCol md={3}>
                <div className="h3 text-danger">{scoreState.losses}</div>
                <div className="text-muted">Losses</div>
              </CCol>
              <CCol md={3}>
                <div className="h3 text-info">{winRate}%</div>
                <div className="text-muted">Win Rate</div>
              </CCol>
            </CRow>
            {scoreState.attempts > 0 && (
              <>
                <CRow className="mt-3">
                  <CCol xs={12}>
                    <div className="mb-2">
                      <strong>Success Rate Progress</strong>
                    </div>
                    <CProgress>
                      <CProgress color="success" value={winRate} style={{ width: `${winRate}%` }} />
                      <CProgress
                        color="danger"
                        value={lossRate}
                        style={{ width: `${lossRate}%` }}
                      />
                    </CProgress>
                    <div className="d-flex justify-content-between mt-1">
                      <small className="text-success">Wins: {scoreState.wins}</small>
                      <small className="text-danger">Losses: {scoreState.losses}</small>
                    </div>
                  </CCol>
                </CRow>
                <CRow className="mt-3">
                  <CCol xs={12}>
                    <div className="border-top pt-3">
                      <h6 className="mb-2">Batch Diversity Analysis</h6>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Diverse Criteria:</span>
                        <span className="fw-bold">
                          {diverseCriteria}/{totalCriteria}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Required Diversity:</span>
                        <span>{requiredDiversity}+ criteria</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Parse Failures:</span>
                        <span className="fw-bold text-warning">
                          {scoreState.parseFailures || 0}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Batch Result:</span>
                        <span className={`fw-bold ${batchWin ? 'text-success' : 'text-danger'}`}>
                          {batchWin ? 'PASS ✅' : 'FAIL ❌'}
                        </span>
                      </div>
                    </div>
                  </CCol>
                </CRow>
              </>
            )}

            {isSubmitting && (
              <CRow className="mt-3">
                <CCol xs={12}>
                  <div className="text-muted">
                    <small>Batch run in progress...</small>
                  </div>
                </CCol>
              </CRow>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

Scoreboard.propTypes = {
  isSubmitting: PropTypes.bool,
  scoreState: PropTypes.shape({
    attempts: PropTypes.number,
    wins: PropTypes.number,
    losses: PropTypes.number,
    parseFailures: PropTypes.number,
    criteriaStats: PropTypes.object,
  }),
}

export default Scoreboard
