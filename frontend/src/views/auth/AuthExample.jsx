import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
  CAlert,
} from '@coreui/react'
import { configApi } from '../../services/api'

const AuthExample = () => {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await configApi.getActive()
      setConfig(response.data)
    } catch (err) {
      setError('Failed to load configuration. Make sure backend is running.')
      console.error('Config fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody>Loading authentication configuration...</CCardBody>
          </CCard>
        </CCol>
      </CRow>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Authentication System</strong>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}

            {config && (
              <CAlert color="success">
                <strong>Active Configuration:</strong> {config.name} ({config.provider})
                <br />
                <small>Models: {config.models.join(', ')}</small>
              </CAlert>
            )}

            <div className="mt-3">
              <h5>Available Authentication Endpoints:</h5>
              <ul>
                <li>
                  <code>POST /auth/login</code> - Local login with email/password
                </li>
                <li>
                  <code>POST /auth/register</code> - Register new user
                </li>
                <li>
                  <code>GET /auth/google</code> - Google OAuth login
                </li>
                <li>
                  <code>GET /auth/profile</code> - Get user profile (requires JWT)
                </li>
              </ul>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default AuthExample
