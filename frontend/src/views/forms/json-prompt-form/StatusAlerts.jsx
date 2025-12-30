import {
  CAlert,
  CCol,
  CRow,
} from '@coreui/react'
import PropTypes from 'prop-types'

/**
 * Component for displaying status alerts and loading states
 * @param {Object} props - Component props
 * @param {boolean} props.configLoading - Whether LLM configurations are loading
 * @param {Array} props.llmConfigs - Array of LLM provider configurations
 * @param {string} props.submitMessage - Current submit message to display
 */
const StatusAlerts = ({
  configLoading,
  llmConfigs,
  submitMessage,
}) => {
  return (
    <>
      <CRow>
        <CCol xs={12}>
          {/* LLM Configuration Status */}
          {configLoading ? (
            <CAlert color="info" className="mb-3">
              Loading LLM configuration...
            </CAlert>
          ) : llmConfigs && llmConfigs.length > 0 ? (
            <CAlert color="success" className="mb-3">
              Connected to {llmConfigs.length} LLM provider(s)
            </CAlert>
          ) : (
            <CAlert color="warning" className="mb-3">
              Using fallback configuration (check backend connection)
            </CAlert>
          )}
        </CCol>
      </CRow>
      <CRow>
        <CCol xs={12}>
          {submitMessage && (
            <CAlert
              color={submitMessage.includes('Error') ? 'danger' : 'success'}
              className="mb-3"
            >
              {submitMessage}
            </CAlert>
          )}
        </CCol>
      </CRow>
    </>
  )
}

StatusAlerts.propTypes = {
  configLoading: PropTypes.bool,
  llmConfigs: PropTypes.arrayOf(PropTypes.shape({
    provider: PropTypes.string,
    isActive: PropTypes.bool,
  })),
  submitMessage: PropTypes.string,
}

export default StatusAlerts