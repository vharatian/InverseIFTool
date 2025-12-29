import React, { useState, useCallback } from 'react'
import { CFormTextarea, CFormFeedback, CFormLabel, CAlert } from '@coreui/react'

const JsonArrayTextarea = ({
  id = 'jsonArrayTextarea',
  label = 'JSON Array Input',
  placeholder = 'Enter a JSON array...',
  rows = 10,
  value = '',
  onChange,
  onValidJson,
  className,
  ...props
}) => {
  const [isValid, setIsValid] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [jsonArray, setJsonArray] = useState(null)

  const validateJsonArray = useCallback(
    (jsonString) => {
      if (!jsonString.trim()) {
        setIsValid(true)
        setErrorMessage('')
        setJsonArray(null)
        onValidJson?.(null)
        return
      }

      try {
        const parsed = JSON.parse(jsonString)

        if (!Array.isArray(parsed)) {
          setIsValid(false)
          setErrorMessage('Input must be a JSON array')
          setJsonArray(null)
          onValidJson?.(null)
          return
        }

        setIsValid(true)
        setErrorMessage('')
        setJsonArray(parsed)
        onValidJson?.(parsed)
      } catch (error) {
        setIsValid(false)
        setErrorMessage(`Invalid JSON: ${error.message}`)
        setJsonArray(null)
        onValidJson?.(null)
      }
    },
    [onValidJson],
  )

  const handleChange = (e) => {
    const newValue = e.target.value
    onChange?.(newValue)
    validateJsonArray(newValue)
  }

  return (
    <div className={className}>
      <CFormLabel htmlFor={id}>{label}</CFormLabel>
      <CFormTextarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        invalid={!isValid}
        {...props}
      />
      <CFormFeedback invalid={!isValid}>{errorMessage}</CFormFeedback>

      {isValid && jsonArray && (
        <CAlert color="success" className="mt-2">
          Valid JSON array with {jsonArray.length} items
        </CAlert>
      )}
    </div>
  )
}

export default JsonArrayTextarea
