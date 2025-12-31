/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the delay
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Decode JWT token without verification (client-side only)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
export const decodeJWT = (token) => {
  try {
    if (!token) return null
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if token is expired or invalid
 */
export const isTokenExpired = (token) => {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) return true

  // exp is in seconds, Date.now() is in milliseconds
  const currentTime = Math.floor(Date.now() / 1000)
  return decoded.exp < currentTime
}

/**
 * Get token expiration time in milliseconds
 * @param {string} token - JWT token
 * @returns {number|null} Expiration time or null if invalid
 */
export const getTokenExpiration = (token) => {
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.exp) return null

  // Convert to milliseconds
  return decoded.exp * 1000
}

// Helper to generate random ID
function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

/**
 * Generates the JSON structure for a Jupyter Notebook (.ipynb)
 * following the Technical Support/Evaluation format.
 * @param {Object} data - The data to populate the notebook
 * @param {string} data.taskId - Task identifier (UUID)
 * @param {string} data.domain - Domain of the task
 * @param {string} data.promptLength - Prompt length category
 * @param {string} data.userPrompt - The user prompt
 * @param {string} [data.idealResponse] - The ideal response
 * @param {Array} data.criteria - Evaluation criteria
 * @param {string} data.judgePromptTemplate - Template for judge prompt
 * @param {string} data.judgeSystemPrompt - System prompt for judge
 * @param {Array} data.responses - Array of response objects {model, content, judgeText, isManual}
 * @param {number} data.attempts - Number of attempts made
 * @returns {string} JSON string of the notebook
 */
export function generateNotebookTemplate(data) {
  const cells = [

    {
      cell_type: 'markdown',
      metadata: { id: generateId() },
      source: ['**[prompt]**\n', '\n', data.userPrompt],
    },
  ]

  if (data.idealResponse) {
    cells.push({
      cell_type: 'markdown',
      metadata: { id: generateId() },
      source: ['**[response]**\n', '\n', data.idealResponse],
    })
  }

  cells.push({
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: [
      '**[response_reference]**\n',
      '\n',
      'Each criterion is evaluated independently as PASS or FAIL.\n',
      '\n',
      data.criteria.map((c) => JSON.stringify(c, null, 2)).join(',\n'),
      '\n',
      '\n',
      'Failure to PASS more than 50% of the above criteria will result in a score of 0 points.',
    ],
  })

  cells.push({
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: ['**[judge_prompt_template]**\n', '\n', data.judgePromptTemplate],
  })

  cells.push({
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: ['**[judge_system_prompt]**\n', '\n', data.judgeSystemPrompt],
  })

  // Add cells for each response
  data.responses.forEach((response, index) => {
    const modelName = response.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    cells.push({
      cell_type: 'markdown',
      metadata: { id: generateId() },
      source: [`**[${modelName}_${index + 1}]**\n`, '\n', response.content || 'No response'],
    })

    if (response.judgeText) {
      cells.push({
        cell_type: 'markdown',
        metadata: { id: generateId() },
        source: [`**[llm_judge_${index + 1}]**\n`, '\n', response.judgeText],
      })
    }

    if (response.isManual && response.judgeText) {
      cells.push({
        cell_type: 'markdown',
        metadata: { id: generateId() },
        source: [`**[human_judge_${index + 1}]**\n`, '\n', response.judgeText],
      })
    }
  })

  cells.push({
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: ['**[number_of_attempts_made]**:\n', '\n', data.attempts.toString()],
  })

  const notebook = {
    cells,
    metadata: {
      colab: {
        provenance: [],
      },
      kernelspec: {
        display_name: 'Python 3',
        name: 'python3',
      },
    },
    nbformat: 4,
    nbformat_minor: 5,
  }

  return JSON.stringify(notebook, null, 2)
}
