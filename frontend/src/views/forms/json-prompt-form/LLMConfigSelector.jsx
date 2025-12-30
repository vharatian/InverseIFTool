
import {
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import PropTypes from 'prop-types'

/**
 * Component for selecting LLM providers and models for test and judge roles
 * @param {Object} props - Component props
 * @param {Array} props.llmConfigs - Array of LLM provider configurations
 * @param {boolean} props.configLoading - Whether configurations are loading
 * @param {string} props.testProvider - Selected test provider
 * @param {string} props.testModel - Selected test model
 * @param {string} props.judgeProvider - Selected judge provider
 * @param {string} props.judgeModel - Selected judge model
 * @param {Function} props.onTestProviderChange - Handler for test provider change
 * @param {Function} props.onTestModelChange - Handler for test model change
 * @param {Function} props.onJudgeProviderChange - Handler for judge provider change
 * @param {Function} props.onJudgeModelChange - Handler for judge model change
 */
const LLMConfigSelector = ({
  llmConfigs,
  configLoading,
  testProvider,
  testModel,
  judgeProvider,
  judgeModel,
  onTestProviderChange,
  onTestModelChange,
  onJudgeProviderChange,
  onJudgeModelChange,
}) => {
  return (
    <CRow>
      <CCol md={3}>
        <div className="mb-3">
          <CFormLabel htmlFor="testProviderSelect">Test Provider</CFormLabel>
          <CFormSelect
            id="testProviderSelect"
            value={testProvider}
            onChange={(e) => onTestProviderChange(e.target.value)}
            disabled={configLoading}
          >
            <option value="">Select Provider</option>
            {llmConfigs?.map((config) => (
              <option key={config.provider} value={config.provider}>
                {config.provider}
              </option>
            ))}
          </CFormSelect>
        </div>
      </CCol>
      <CCol md={3}>
        <div className="mb-3">
          <CFormLabel htmlFor="testModelSelect">Test Model</CFormLabel>
          <CFormSelect
            id="testModelSelect"
            value={testModel}
            onChange={(e) => onTestModelChange(e.target.value)}
            disabled={configLoading || !testProvider}
          >
            <option value="">Select Model</option>
            {llmConfigs?.find(c => c.provider === testProvider)?.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </CFormSelect>
        </div>
      </CCol>
      <CCol md={3}>
        <div className="mb-3">
          <CFormLabel htmlFor="judgeProviderSelect">Judge Provider</CFormLabel>
          <CFormSelect
            id="judgeProviderSelect"
            value={judgeProvider}
            onChange={(e) => onJudgeProviderChange(e.target.value)}
            disabled={configLoading}
          >
            <option value="">Select Provider</option>
            {llmConfigs?.map((config) => (
              <option key={config.provider} value={config.provider}>
                {config.provider}
              </option>
            ))}
          </CFormSelect>
        </div>
      </CCol>
      <CCol md={3}>
        <div className="mb-3">
          <CFormLabel htmlFor="judgeModelSelect">Judge Model</CFormLabel>
          <CFormSelect
            id="judgeModelSelect"
            value={judgeModel}
            onChange={(e) => onJudgeModelChange(e.target.value)}
            disabled={configLoading || !judgeProvider}
          >
            <option value="">Select Model</option>
            {llmConfigs?.find(c => c.provider === judgeProvider)?.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </CFormSelect>
        </div>
      </CCol>
    </CRow>
  )
}

LLMConfigSelector.propTypes = {
  llmConfigs: PropTypes.arrayOf(PropTypes.shape({
    provider: PropTypes.string,
    models: PropTypes.arrayOf(PropTypes.string),
  })),
  configLoading: PropTypes.bool,
  testProvider: PropTypes.string,
  testModel: PropTypes.string,
  judgeProvider: PropTypes.string,
  judgeModel: PropTypes.string,
  onTestProviderChange: PropTypes.func.isRequired,
  onTestModelChange: PropTypes.func.isRequired,
  onJudgeProviderChange: PropTypes.func.isRequired,
  onJudgeModelChange: PropTypes.func.isRequired,
}

export default LLMConfigSelector
