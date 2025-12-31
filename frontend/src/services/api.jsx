import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

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

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If token expired and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('Received 401 error, attempting token refresh...')
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        console.log('Refresh token available:', !!refreshToken)

        if (refreshToken) {
          console.log('Attempting token refresh...')

          // Use axios instance without interceptors to avoid recursion
          const refreshResponse = await api.post('/auth/refresh', {
            refresh_token: refreshToken
          })

          const { access_token, refresh_token: newRefreshToken } = refreshResponse.data
          console.log('Token refresh successful, new tokens received')

          // Update stored tokens
          localStorage.setItem('auth_token', access_token)
          localStorage.setItem('refresh_token', newRefreshToken)

          // Update axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

          // Notify AuthContext of token refresh
          window.dispatchEvent(new CustomEvent('auth:tokenRefreshed', {
            detail: { access_token, refresh_token: newRefreshToken }
          }))

          console.log('Token refresh completed, retrying original request')
          // Retry original request with new token
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`
          return api(originalRequest)
        } else {
          console.log('No refresh token available, redirecting to login')
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.response?.data || refreshError.message)
        // Token refresh failed, clear tokens and redirect to login
        localStorage.removeItem('auth_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('auth_user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

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
 * @property {string} id - Unique identifier for the provider configuration
 * @property {string} name - Human-readable name for the provider
 * @property {string} provider - Custom provider name (any string)
 * @property {'openai' | 'anthropic' | 'google' | 'custom'} sdk - SDK implementation to use
 * @property {string} apiKey - API key for the provider (masked in responses)
 * @property {string} [baseUrl] - Optional base URL for the API
 * @property {string[]} models - Array of available models for this provider
 * @property {string} defaultModel - Default model to use
 * @property {boolean} isActive - Whether this provider is active
 * @property {string} createdAt - ISO timestamp of creation
 * @property {string} updatedAt - ISO timestamp of last update
 */

/**
 * User Management API endpoints
 * @namespace userApi
 */
export const userApi = {
  /**
   * Get all users
   * @returns {Promise<AxiosResponse<User[]>>} List of all users
   */
  getAll: () => api.get('/users'),

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<AxiosResponse<User>>} User data
   */
  getById: (id) => api.get(`/users/${id}`),

  /**
   * Create a new user
   * @param {Omit<User, 'id' | 'createdAt' | 'updatedAt'>} user - User data
   * @returns {Promise<AxiosResponse<User>>} Created user
   */
  create: (user) => api.post('/users', user),

  /**
   * Update an existing user
   * @param {string} id - User ID
   * @param {Partial<User>} user - Updated user data
   * @returns {Promise<AxiosResponse<User>>} Updated user
   */
  update: (id, user) => api.put(`/users/${id}`, user),

  /**
   * Delete a user
   * @param {string} id - User ID
   * @returns {Promise<AxiosResponse<void>>} Deletion confirmation
   */
  delete: (id) => api.delete(`/users/${id}`),
}

/**
 * LLM Provider Configuration API endpoints
 * @namespace configApi
 */
export const configApi = {
  /**
   * Get all LLM provider configurations
   * @returns {Promise<AxiosResponse<LLMProviderConfig[]>>} List of all configurations
   */
  getAll: () => api.get('/config'),

  /**
   * Get active LLM provider configuration
   * @returns {Promise<AxiosResponse<{models: string[], defaultModel: string}>>} Active config data
   */
  getActive: () => api.get('/config/active'),

  /**
   * Get configuration by ID
   * @param {string} id - Configuration ID
   * @returns {Promise<AxiosResponse<LLMProviderConfig>>} Configuration data
   */
  getById: (id) => api.get(`/config/${id}`),

  /**
   * Create a new provider configuration
   * @param {Omit<LLMProviderConfig, 'id' | 'createdAt' | 'updatedAt'>} config - Configuration data
   * @returns {Promise<AxiosResponse<{error: string, message: string}>>} Result (note: creation disabled)
   */
  create: (config) => api.post('/config', config),

  /**
   * Update an existing configuration
   * @param {string} id - Configuration ID
   * @param {Partial<LLMProviderConfig>} config - Updated configuration data
   * @returns {Promise<AxiosResponse<{error: string, message: string}>>} Result (note: updates disabled)
   */
  update: (id, config) => api.put(`/config/${id}`, config),

  /**
   * Activate a configuration
   * @param {string} id - Configuration ID
   * @returns {Promise<AxiosResponse<{error: string, message: string}>>} Result (note: activation disabled)
   */
  activate: (id) => api.put(`/config/${id}/activate`),

  /**
   * Delete a configuration
   * @param {string} id - Configuration ID
   * @returns {Promise<AxiosResponse<{error: string, message: string}>>} Result (note: deletion disabled)
   */
  delete: (id) => api.delete(`/config/${id}`),
}

/**
 * LLM API endpoints for text generation
 * @namespace llmApi
 */
export const llmApi = {
  /**
   * Generate a response from a text prompt
   * @param {string} prompt - The text prompt to send to the LLM
   * @param {Object} [options] - Generation options
   * @param {string} [options.model] - Model to use for generation
   * @param {string} [options.provider] - Provider to use
   * @param {number} [options.temperature] - Temperature for generation (0.0-2.0)
   * @param {number} [options.max_tokens] - Maximum tokens to generate
   * @returns {Promise<AxiosResponse<{response: string}>>} Generated response
   */
  generateResponse: (prompt, options) => api.post('/llm/generate', { prompt, options }),

  /**
   * Generate a response using a messages array (chat format)
   * @param {Array<{role: 'system'|'user'|'assistant', content: string}>} messages - Chat messages
   * @param {Object} [options] - Generation options
   * @param {string} [options.model] - Model to use for generation
   * @param {string} [options.provider] - Provider to use
   * @param {number} [options.temperature] - Temperature for generation (0.0-2.0)
   * @param {number} [options.max_tokens] - Maximum tokens to generate
   * @returns {Promise<AxiosResponse<{response: string}>>} Generated response
   */
  generateResponseWithMessages: (messages, options) =>
    api.post('/llm/generate-with-messages', { messages, options }),
}

export default api
