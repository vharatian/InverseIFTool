import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  CSpinner,
} from '@coreui/react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const Register = () => {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await api.post('/auth/register', { name, email, password })
      const data = response.data

      if (data.access_token && data.refresh_token && data.user) {
        register(data.access_token, data.refresh_token, data.user)
        navigate('/')
      } else {
        throw new Error('Invalid response')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CRow className="justify-content-center">
      <CCol md={6}>
        <CCard>
          <CCardHeader>
            <h4>Register</h4>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <div className="mb-3">
                <CFormLabel htmlFor="name">Full Name</CFormLabel>
                <CFormInput
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="mb-3">
                <CFormLabel htmlFor="email">Email</CFormLabel>
                <CFormInput
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="mb-3">
                <CFormLabel htmlFor="password">Password</CFormLabel>
                <CFormInput
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="mb-3">
                <CFormLabel htmlFor="confirmPassword">Confirm Password</CFormLabel>
                <CFormInput
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <CButton type="submit" color="primary" className="w-100" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </CButton>
            </CForm>

            <div className="text-center mt-3">
              <p>
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Register
