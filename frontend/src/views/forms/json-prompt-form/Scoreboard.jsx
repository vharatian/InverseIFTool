import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
} from '@coreui/react'
import PropTypes from 'prop-types'

/**
 * Component for displaying batch run statistics and scoreboard
 * @param {Object} props - Component props
 * @param {number} props.attempts - Total number of attempts made
 * @param {number} props.wins - Number of successful evaluations
 * @param {boolean} props.isSubmitting - Whether a batch is currently running
 * @param {Object} props.batchResults - Batch-level analysis results
 */
const Scoreboard = ({
  attempts,
  wins,
  isSubmitting,
  batchResults,
}) => {
  const winRate = attempts > 0 ? Math.round((wins / attempts) * 100) : 0
  const lossRate = attempts > 0 ? 100 - winRate : 0

  // Get the latest batch result
  const latestBatchResult = batchResults && Object.values(batchResults).pop()

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
                <div className="h3 text-primary">{attempts}</div>
                <div className="text-muted">Total Attempts</div>
              </CCol>
              <CCol md={3}>
                <div className="h3 text-success">{wins}</div>
                <div className="text-muted">Wins</div>
              </CCol>
              <CCol md={3}>
                <div className="h3 text-danger">{attempts - wins}</div>
                <div className="text-muted">Losses</div>
              </CCol>
              <CCol md={3}>
                <div className="h3 text-info">{winRate}%</div>
                <div className="text-muted">Win Rate</div>
              </CCol>
            </CRow>
            {attempts > 0 && (
              <CRow className="mt-3">
                <CCol xs={12}>
                  <div className="mb-2">
                    <strong>Success Rate Progress</strong>
                  </div>
                  <CProgress>
                    <CProgress
                      color="success"
                      value={winRate}
                      style={{ width: `${winRate}%` }}
                    />
                    <CProgress
                      color="danger"
                      value={lossRate}
                      style={{ width: `${lossRate}%` }}
                    />
                  </CProgress>
                  <div className="d-flex justify-content-between mt-1">
                    <small className="text-success">Wins: {wins}</small>
                    <small className="text-danger">Losses: {attempts - wins}</small>
                  </div>
                </CCol>
              </CRow>
            )}
            {latestBatchResult && (
              <CRow className="mt-3">
                <CCol xs={12}>
                  <div className="border-top pt-3">
                    <h6 className="mb-2">Batch Diversity Analysis</h6>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Diverse Criteria:</span>
                      <span className="fw-bold">
                        {latestBatchResult.diverseCriteria}/{latestBatchResult.totalCriteria}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Required Diversity:</span>
                      <span>{latestBatchResult.requiredDiversity}+ criteria</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Batch Result:</span>
                      <span className={`fw-bold ${latestBatchResult.batchWin ? 'text-success' : 'text-danger'}`}>
                        {latestBatchResult.batchWin ? 'PASS ✅' : 'FAIL ❌'}
                      </span>
                    </div>
                  </div>
                </CCol>
              </CRow>
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
  attempts: PropTypes.number,
  wins: PropTypes.number,
  isSubmitting: PropTypes.bool,
  batchResults: PropTypes.object,
}

export default Scoreboard