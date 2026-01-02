import { CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import PropTypes from 'prop-types'
import { useEffect } from 'react'

/**
 * Component for selecting LLM models for test and judge roles
 * Automatically determines the provider based on selected model
 * @param {Object} props - Component props
 * @param {Array} props.llmConfigs - Array of LLM provider configurations
 * @param {boolean} props.configLoading - Whether configurations are loading
 * @param {string} props.testModel - Selected test model
 * @param {string} props.judgeModel - Selected judge model
 * @param {Function} props.onTestModelChange - Handler for test model change
 * @param {Function} props.onJudgeModelChange - Handler for judge model change
 */
const LLMConfigSelector = ({
  llmConfigs,
  configLoading,
  testModel,
  judgeModel,
  onTestModelChange,
  onJudgeModelChange,
}) => {
  // Create a flat list of all available models with their provider info
  //
  useEffect(() => {
    console.log(llmConfigs)
  }, [llmConfigs])

  return (
    <CRow>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="testModelSelect">Test Model</CFormLabel>
          <CFormSelect
            id="testModelSelect"
            value={testModel}
            onChange={(e) => onTestModelChange(e.target.value)}
            disabled={configLoading}
          >
            <option value="">Select Test Model</option>
            {llmConfigs.test?.map(({ option }) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </CFormSelect>
        </div>
      </CCol>
      <CCol md={6}>
        <div className="mb-3">
          <CFormLabel htmlFor="judgeModelSelect">Judge Model</CFormLabel>
          <CFormSelect
            id="judgeModelSelect"
            value={judgeModel}
            onChange={(e) => onJudgeModelChange(e.target.value)}
            disabled={configLoading}
          >
            <option value="">Select Judge Model</option>
            {llmConfigs.judge?.map(({ option }) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </CFormSelect>
        </div>
      </CCol>
    </CRow>
  )
}

LLMConfigSelector.propTypes = {
  llmConfigs: PropTypes.arrayOf(
    PropTypes.shape({
      provider: PropTypes.string,
      models: PropTypes.arrayOf(PropTypes.string),
    }),
  ),
  configLoading: PropTypes.bool,
  testModel: PropTypes.string,
  judgeModel: PropTypes.string,
  onTestModelChange: PropTypes.func.isRequired,
  onJudgeModelChange: PropTypes.func.isRequired,
}

export default LLMConfigSelector
