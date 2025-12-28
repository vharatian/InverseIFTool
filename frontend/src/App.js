import React, { Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/index'
import { useSelector } from 'react-redux'

import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'

// We use those styles to show code examples, you should remove them in your application.
import './scss/examples.scss'

// Contexts
import { AuthProvider } from './contexts/AuthContext'

// Containers
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))

// Pages
const Login = React.lazy(() => import('./views/auth/Login'))
const Register = React.lazy(() => import('./views/auth/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

// Components
const ProtectedRoute = React.lazy(() => import('./components/ProtectedRoute'))

const App = () => {
  const { isColorModeSet, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const storedTheme = useSelector((state) => state.theme)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.href.split('?')[1])
    const theme = urlParams.get('theme') && urlParams.get('theme').match(/^[A-Za-z0-9\s]+/)[0]
    if (theme) {
      setColorMode(theme)
    }

    if (isColorModeSet()) {
      return
    }

    setColorMode(storedTheme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Provider store={store}>
      <AuthProvider>
        <HashRouter>
          <Suspense
            fallback={
              <div className="pt-3 text-center">
                <CSpinner color="primary" variant="grow" />
              </div>
            }
          >
            <Routes>
              <Route exact path="/login" name="Login Page" element={<Login />} />
              <Route exact path="/register" name="Register Page" element={<Register />} />
              <Route exact path="/404" name="Page 404" element={<Page404 />} />
              <Route exact path="/500" name="Page 500" element={<Page500 />} />
              <Route
                path="*"
                name="Home"
                element={
                  <ProtectedRoute>
                    <DefaultLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </HashRouter>
      </AuthProvider>
    </Provider>
  )
}

export default App
