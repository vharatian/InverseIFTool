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
 */
const Scoreboard = ({
  attempts,
  wins,
  isSubmitting,
}) => {
  const winRate = attempts > 0 ? Math.round((wins / attempts) * 100) : 0
  const lossRate = attempts > 0 ? 100 - winRate : 0

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
}

export default Scoreboard