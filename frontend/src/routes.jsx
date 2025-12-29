import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const JsonPromptForm = React.lazy(() => import('./views/forms/json-prompt-form/JsonPromptForm'))
const AuthExample = React.lazy(() => import('./views/auth/AuthExample'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/json-prompt-form', name: 'JSON Prompt Form', element: JsonPromptForm },
  { path: '/auth', name: 'Authentication', element: AuthExample },
  { path: '/login', name: 'Login', element: null }, // Handled by App.js
  { path: '/register', name: 'Register', element: null }, // Handled by App.js
]

export default routes
