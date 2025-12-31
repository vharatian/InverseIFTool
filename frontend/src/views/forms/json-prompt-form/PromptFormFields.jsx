import { CFormLabel, CFormTextarea } from '@coreui/react'
import PropTypes from 'prop-types'
import JsonArrayTextarea from '../../../components/JsonArrayTextarea'

/**
 * Component for prompt form input fields
 * @param {Object} props - Component props
 * @param {string} props.prompt - The prompt text
 * @param {string} props.idealResponse - The ideal response text
 * @param {string} props.criteriaJson - The criteria JSON string
 * @param {string} props.judgeSystemPrompt - The judge system prompt
 * @param {number} props.maxTry - Maximum number of attempts
  * @param {boolean} props.isRunning - Whether form is running
 * @param {Function} props.onPromptChange - Handler for prompt change
 * @param {Function} props.onIdealResponseChange - Handler for ideal response change
 * @param {Function} props.onCriteriaJsonChange - Handler for criteria JSON change
 * @param {Function} props.onJudgeSystemPromptChange - Handler for judge system prompt change
 * @param {Function} props.onMaxTryChange - Handler for max attempts change
 * @param {Function} props.onJsonValid - Handler for valid JSON
 */
const PromptFormFields = ({
  prompt,
  idealResponse,
  criteriaJson,
  judgeSystemPrompt,
  maxTry,
  isRunning,
  onPromptChange,
  onIdealResponseChange,
  onCriteriaJsonChange,
  onJudgeSystemPromptChange,
  onMaxTryChange,
  onJsonValid,
}) => {
  return (
    <>
      <div className="mb-3">
        <CFormLabel htmlFor="promptTextarea">Prompt</CFormLabel>
        <CFormTextarea
          id="promptTextarea"
          rows={6}
          placeholder="Enter your prompt here..."
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <CFormLabel htmlFor="idealTextarea">Ideal Response</CFormLabel>
        <CFormTextarea
          id="idealTextarea"
          rows={6}
          placeholder="Enter your ideal response here..."
          value={idealResponse}
          onChange={(e) => onIdealResponseChange(e.target.value)}
          required
        />
      </div>
      <div className="mb-3">
        <CFormLabel htmlFor="judgePromptTextarea">Judge System Prompt</CFormLabel>
        <CFormTextarea
          id="judgePromptTextarea"
          rows={8}
          placeholder="Enter the judge system prompt for evaluation..."
          value={judgeSystemPrompt}
          onChange={(e) => onJudgeSystemPromptChange(e.target.value)}
          required
        />
        <small className="form-text text-muted">
          This prompt instructs the judge model on how to evaluate responses against the criteria.
        </small>
      </div>
      <div className="mb-3">
        <JsonArrayTextarea
          label="Criteria JSON Array"
          placeholder='Enter JSON array like: ["criterion1", "criterion2", "criterion3"]'
          rows={8}
          value={criteriaJson}
          onChange={onCriteriaJsonChange}
          onValidJson={onJsonValid}
        />
        <div className="mb-3">
          <CFormLabel htmlFor="maxTryInput">Max Attempts (default: 20)</CFormLabel>
          <input
            type="number"
            id="maxTryInput"
            className="form-control"
            value={maxTry}
            onChange={(e) =>
              onMaxTryChange(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))
            }
            min="1"
            max="100"
            disabled={isRunning}
          />
          <small className="form-text text-muted">
            Maximum number of evaluation attempts (1-100)
          </small>
        </div>
      </div>
    </>
  )
}

PromptFormFields.propTypes = {
  prompt: PropTypes.string,
  idealResponse: PropTypes.string,
  criteriaJson: PropTypes.string,
  judgeSystemPrompt: PropTypes.string,
  maxTry: PropTypes.number,
  isRunning: PropTypes.bool,
  onPromptChange: PropTypes.func.isRequired,
  onIdealResponseChange: PropTypes.func.isRequired,
  onCriteriaJsonChange: PropTypes.func.isRequired,
  onJudgeSystemPromptChange: PropTypes.func.isRequired,
  onMaxTryChange: PropTypes.func.isRequired,
  onJsonValid: PropTypes.func.isRequired,
}

export default PromptFormFields
