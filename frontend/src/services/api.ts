import axios from 'axios'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3002'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for auth
api.interceptors.request.use(
  (config) => {
    // Add auth token from localStorage
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  },
)

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} LLMProviderConfig
 * @property {string} id
 * @property {string} name
 * @property {'openai' | 'anthropic' | 'google' | 'custom'} provider
 * @property {string} apiKey
 * @property {string} [baseUrl]
 * @property {string[]} models
 * @property {string} defaultModel
 * @property {boolean} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 */

// User Management API
export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (user) => api.post('/users', user),
  update: (id, user) => api.put(`/users/${id}`, user),
  delete: (id) => api.delete(`/users/${id}`),
}

// Configuration API
export const configApi = {
  getAll: () => api.get('/config'),
  getActive: () => api.get('/config/active'),
  getById: (id) => api.get(`/config/${id}`),
  create: (config) => api.post('/config', config),
  update: (id, config) => api.put(`/config/${id}`, config),
  activate: (id) => api.put(`/config/${id}/activate`),
  delete: (id) => api.delete(`/config/${id}`),
}

export default api
