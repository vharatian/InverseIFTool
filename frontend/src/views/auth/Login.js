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

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:3002/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()

      if (data.access_token && data.user) {
        login(data.access_token, data.user)
        navigate('/')
      } else {
        throw new Error('Invalid response')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CRow className="justify-content-center">
      <CCol md={6}>
        <CCard className="mt-5">
          <CCardHeader>
            <h4>Login</h4>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" className="mb-3">
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
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

              <CButton type="submit" color="primary" disabled={isLoading} className="w-100">
                {isLoading ? (
                  <>
                    <CSpinner size="sm" className="me-2" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </CButton>
            </CForm>

            <div className="mt-3 text-center">
              <p className="mb-0">Default admin credentials:</p>
              <small className="text-muted">
                Email: admin@example.com
                <br />
                Password: admin123
              </small>
            </div>

            <div className="text-center mt-3">
              <p>
                Don't have an account? <Link to="/register">Sign up</Link>
              </p>
            </div>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default Login
