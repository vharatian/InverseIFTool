// Helper to generate random ID
function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Generates the JSON structure for a Jupyter Notebook (.ipynb)
 * following the Technical Support/Evaluation format.
 * @param {Object} data - The data to populate the notebook
 * @param {string} data.userPrompt - The user prompt
 * @param {string} [data.idealResponse] - The ideal response
 * @param {Array} data.criteria - Evaluation criteria
 * @param {string} data.judgeSystemPrompt - System prompt for judge
 * @param {Array} data.responses - Array of response objects {model, content, judgeText, isManual}
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
      '[\n',
      data.criteria.map((c) => JSON.stringify(c, null, 2)).join(' ,\n'),
      '\n',
      '\n',
      '] \n',
      '\n',
      'Failure to PASS more than 50% of the above criteria will result in a score of 0 points.',
    ],
  })

  cells.push({
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: ['**[judge_system_prompt]**\n', '\n', data.judgeSystemPrompt],
  })

  cells.push({
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: [
      '**[judge_prompt_template]**\n',
      '\n', ,
      '\n',
      ':{prompt}\n',
      '\n',
      '\n',
      ':{response_reference}\n',
      '\n',
      '\n',
      ':{response}\n',
    ],
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

/**
 * Parses notebook content from various input types into JSON object
 * @param {string|Buffer|ArrayBuffer|File} input - Notebook content
 * @returns {Promise<Object>|Object} Parsed notebook JSON object
 */
export function parseNotebook(input) {
  try {
    let jsonString

    if (typeof input === 'string') {
      jsonString = input
    } else if (input instanceof ArrayBuffer) {
      jsonString = new TextDecoder('utf-8').decode(input)
    } else if (input instanceof File) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const json = JSON.parse(e.target.result)
            resolve(json)
          } catch (error) {
            reject(new Error(`Failed to parse notebook file: ${error.message}`))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsText(input)
      })
    } else {
      throw new Error('Unsupported input type. Expected string, ArrayBuffer, or File.')
    }

    return JSON.parse(jsonString)
  } catch (error) {
    if (error.message.includes('Failed to parse')) {
      throw error
    }
    throw new Error(`Failed to parse notebook: ${error.message}`)
  }
}

/**
 * Extracts form data from a Jupyter notebook JSON (reverse of generateNotebookTemplate)
 * @param {string|Object} notebookJson - Jupyter notebook JSON string or object
 * @returns {Object} Extraction result with data, errors, and success status
 */
export function extractFormData(notebookJson) {
  const errors = []
  let data = null

  try {
    // Parse notebook JSON if it's a string
    const notebook = typeof notebookJson === 'string' ? JSON.parse(notebookJson) : notebookJson

    // Validate notebook structure
    if (!notebook || !notebook.cells || !Array.isArray(notebook.cells)) {
      errors.push('Invalid notebook format: missing or invalid cells array')
      return { data: null, errors, success: false }
    }

    // Extract sections with warning tracking
    const sections = extractSectionsWithErrors(notebook.cells, errors)

    // Extract and validate criteria (with warnings, not failures)
    const criteria = extractCriteriaWithValidation(sections.response_reference, errors)

    // Always build data object with whatever we found
    data = {
      userPrompt: sections.prompt?.trim() || '',
      idealResponse: sections.response?.trim() || '',
      criteria: criteria,
      judgeSystemPrompt: sections.judge_system_prompt?.trim() || '',
    }

    // Add warnings for missing or empty sections
    if (!sections.prompt || !data.userPrompt) {
      errors.push('Warning: Missing or empty prompt section')
    }
    if (!sections.response_reference) {
      errors.push('Warning: Missing response_reference section')
    }
    if (!sections.judge_system_prompt || !data.judgeSystemPrompt) {
      errors.push('Warning: Missing or empty judge_system_prompt section')
    }
    if (criteria.length === 0) {
      errors.push('Warning: No criteria found in response_reference section')
    }
  } catch (error) {
    errors.push(`Critical parsing error: ${error.message}`)
    return { data: null, errors, success: false }
  }

  // Always return success as long as we have valid notebook structure
  // Warnings are just informational
  return {
    data,
    errors,
    success: data !== null,
  }
}

/**
 * Updates an existing Jupyter notebook with new data, modifying existing sections
 * or inserting missing ones
 * @param {string|Object} notebookJson - Existing notebook JSON string or object
 * @param {Object} data - Data to update/insert in the notebook
 * @param {Object} [options] - Optional configuration
 * @returns {string} Updated notebook JSON string
 */
export function updateNotebook(notebookJson, data, options = {}) {
  // Parse notebook JSON if it's a string
  const notebook = typeof notebookJson === 'string' ? JSON.parse(notebookJson) : notebookJson

  // Validate notebook structure
  if (!notebook || !notebook.cells || !Array.isArray(notebook.cells)) {
    throw new Error('Invalid notebook format: missing or invalid cells array')
  }

  // Clone the notebook to avoid mutations
  const updatedNotebook = JSON.parse(JSON.stringify(notebook))

  // Find existing sections and their cell indices
  const sectionMap = findSectionCells(updatedNotebook.cells)

  // Update existing sections or insert missing ones
  updateOrInsertSections(updatedNotebook.cells, sectionMap, data)

  // Return updated notebook as JSON string
  return JSON.stringify(updatedNotebook, null, 2)
}

/**
 * Find cells containing section markers and map them to indices
 */
function findSectionCells(cells) {
  const sectionMap = {}

  cells.forEach((cell, index) => {
    if (cell.cell_type === 'markdown' && cell.source && Array.isArray(cell.source)) {
      const content = cell.source.join('')

      // Check for section markers (case-insensitive)
      const sections = [
        'prompt',
        'response',
        'response_reference',
        'judge_prompt_template',
        'judge_system_prompt',
      ]

      sections.forEach((section) => {
        const marker = `**[${section}]**`
        if (content.toLowerCase().includes(marker.toLowerCase())) {
          sectionMap[section] = index
        }
      })

      // Also check for model responses and judges
      const modelMatch = content.match(/\*\*\[([a-zA-Z0-9_]+)_\d+\]\*\*/i)
      if (modelMatch) {
        const sectionKey = modelMatch[1].toLowerCase()
        sectionMap[sectionKey] = index
      }
    }
  })

  return sectionMap
}

/**
 * Update existing sections or insert missing ones
 */
function updateOrInsertSections(cells, sectionMap, data) {
  // Define the order of sections for insertion
  const sectionOrder = [
    'prompt',
    'response',
    'response_reference',
    'judge_prompt_template',
    'judge_system_prompt',
  ]

  // Update existing sections
  sectionOrder.forEach((section) => {
    if (sectionMap[section] !== undefined) {
      // Update existing cell
      const cellIndex = sectionMap[section]
      cells[cellIndex].source = generateSectionContent(section, data)
    }
  })

  // Insert missing sections at appropriate positions
  let insertIndex = 0

  sectionOrder.forEach((section) => {
    if (sectionMap[section] === undefined) {
      // Check if we should insert this section
      if (shouldInsertSection(section, data)) {
        const newCell = {
          cell_type: 'markdown',
          metadata: { id: generateId() },
          source: generateSectionContent(section, data),
        }

        // Insert at the current position
        cells.splice(insertIndex, 0, newCell)
        insertIndex++
      }
    } else {
      // Section exists, move insert index past it
      insertIndex = Math.max(insertIndex, sectionMap[section] + 1)
    }
  })

  // Handle responses (model outputs, judges, attempts)
  if (data.responses && data.responses.length > 0) {
    updateOrInsertResponses(cells, data)
  }

  // Handle attempts count
  if (data.attempts !== undefined) {
    updateOrInsertAttempts(cells, data.attempts)
  }
}

/**
 * Check if a section should be inserted based on available data
 */
function shouldInsertSection(section, data) {
  switch (section) {
    case 'prompt':
      return !!data.userPrompt
    case 'response':
      return !!data.idealResponse
    case 'response_reference':
      return !!data.criteria && Array.isArray(data.criteria)
    case 'judge_prompt_template':
      return !!data.judgePromptTemplate
    case 'judge_system_prompt':
      return !!data.judgeSystemPrompt
    default:
      return false
  }
}

/**
 * Generate content for a specific section
 */
function generateSectionContent(section, data) {
  switch (section) {
    case 'prompt':
      return ['**[prompt]**\n', '\n', data.userPrompt]

    case 'response':
      return ['**[response]**\n', '\n', data.idealResponse]

    case 'response_reference':
      return [
        '**[response_reference]**\n',
        '\n',
        'Each criterion is evaluated independently as PASS or FAIL.\n',
        '\n',
        data.criteria.map((c) => JSON.stringify(c, null, 2)).join(',\n'),
        '\n',
        '\n',
        'Failure to PASS more than 50% of the above criteria will result in a score of 0 points.',
      ]

    case 'judge_prompt_template':
      return ['**[judge_prompt_template]**\n', '\n', data.judgePromptTemplate]

    case 'judge_system_prompt':
      return ['**[judge_system_prompt]**\n', '\n', data.judgeSystemPrompt]

    default:
      return ['**[unknown_section]**\n', '\n', 'Content not available']
  }
}

/**
 * Update or insert model responses, judges, and human judges
 */
function updateOrInsertResponses(cells, data) {
  // Find existing response cells
  const existingResponses = findResponseCells(cells)

  // Clear existing response cells (we'll recreate them)
  existingResponses.reverse().forEach((index) => {
    cells.splice(index, 1)
  })

  // Insert new response cells at the end (before attempts if it exists)
  let insertIndex = cells.length

  // Check if there's an attempts section
  const attemptsIndex = cells.findIndex(
    (cell) =>
      cell.cell_type === 'markdown' &&
      cell.source &&
      Array.isArray(cell.source) &&
      cell.source.join('').includes('**[number_of_attempts_made]**'),
  )

  if (attemptsIndex !== -1) {
    insertIndex = attemptsIndex
  }

  // Add response cells
  data.responses.forEach((response, index) => {
    const modelName = response.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()

    // Model response
    cells.splice(insertIndex, 0, {
      cell_type: 'markdown',
      metadata: { id: generateId() },
      source: [`**[${modelName}_${index + 1}]**\n`, '\n', response.content || 'No response'],
    })
    insertIndex++

    // LLM judge (if available)
    if (response.judgeText) {
      cells.splice(insertIndex, 0, {
        cell_type: 'markdown',
        metadata: { id: generateId() },
        source: [`**[llm_judge_${index + 1}]**\n`, '\n', response.judgeText],
      })
      insertIndex++
    }

    // Human judge (if manual and available)
    if (response.isManual && response.judgeText) {
      cells.splice(insertIndex, 0, {
        cell_type: 'markdown',
        metadata: { id: generateId() },
        source: [`**[human_judge_${index + 1}]**\n`, '\n', response.judgeText],
      })
      insertIndex++
    }
  })
}

/**
 * Find all response-related cells (models, judges, attempts)
 */
function findResponseCells(cells) {
  const indices = []

  cells.forEach((cell, index) => {
    if (cell.cell_type === 'markdown' && cell.source && Array.isArray(cell.source)) {
      const content = cell.source.join('')
      if (
        content.match(/\*\*\[[a-zA-Z0-9_]+_\d+\]\*\*/i) ||
        content.includes('**[number_of_attempts_made]**')
      ) {
        indices.push(index)
      }
    }
  })

  return indices
}

/**
 * Update or insert attempts count
 */
function updateOrInsertAttempts(cells, attempts) {
  const attemptsIndex = cells.findIndex(
    (cell) =>
      cell.cell_type === 'markdown' &&
      cell.source &&
      Array.isArray(cell.source) &&
      cell.source.join('').includes('**[number_of_attempts_made]**'),
  )

  const attemptsCell = {
    cell_type: 'markdown',
    metadata: { id: generateId() },
    source: ['**[number_of_attempts_made]**:\n', '\n', attempts.toString()],
  }

  if (attemptsIndex !== -1) {
    // Update existing
    cells[attemptsIndex] = attemptsCell
  } else {
    // Insert at the end
    cells.push(attemptsCell)
  }
}

/**
 * Extract sections from notebook cells with error tracking
 */
function extractSectionsWithErrors(cells, errors) {
  const sections = {}

  cells.forEach((cell) => {
    if (cell.cell_type === 'markdown' && cell.source && Array.isArray(cell.source)) {
      const content = cell.source.join('')

      // Check for section markers
      const promptMatch = content.match(/\*\*\[prompt\]\*\*/i)
      const responseMatch = content.match(/\*\*\[response\]\*\*/i)
      const responseRefMatch = content.match(/\*\*\[response_reference\]\*\*/i)
      const judgeSystemMatch = content.match(/\*\*\[judge_system_prompt\]\*\*/i)

      if (promptMatch) {
        sections.prompt = extractContentAfterMarker(content, '**[prompt]**')
      }
      if (responseMatch) {
        sections.response = extractContentAfterMarker(content, '**[response]**')
      }
      if (responseRefMatch) {
        sections.response_reference = extractContentAfterMarker(content, '**[response_reference]**')
      }
      if (judgeSystemMatch) {
        sections.judge_system_prompt = extractContentAfterMarker(
          content,
          '**[judge_system_prompt]**',
        )
      }
    }
  })

  return sections
}

/**
 * Extract content after a section marker
 */
function extractContentAfterMarker(fullContent, marker) {
  const markerIndex = fullContent.indexOf(marker)
  if (markerIndex === -1) return ''

  // Skip the marker line and extract everything after it
  const afterMarker = fullContent.substring(markerIndex + marker.length)
  const lines = afterMarker.split('\n')

  // Skip empty lines at the beginning
  let startIndex = 0
  while (startIndex < lines.length && (lines[startIndex].trim() === '' || lines[startIndex] === 'null')) {
    startIndex++
  }

  // Filter out 'null' lines
  const filteredLines = lines.slice(startIndex).filter(line => line !== 'null')

  return filteredLines.join('\n').trim()
}

/**
 * Validate that required sections are present
 */
function validateRequiredSections(sections, errors) {
  const required = ['prompt', 'response_reference', 'judge_system_prompt']

  required.forEach((section) => {
    if (!sections[section]) {
      errors.push(`Missing required section: ${section}`)
    }
  })
}

/**
 * Extract and validate criteria JSON from response_reference content
 */
function extractCriteriaWithValidation(responseRefContent, errors) {
  if (!responseRefContent) {
    errors.push('No content found in response_reference section')
    return []
  }

  // Try to find JSON content (array [] or object {})
  const jsonMatches = responseRefContent.match(/(\[[\s\S]*?\]|\{[\s\S]*?\})/g)

  if (!jsonMatches || jsonMatches.length === 0) {
    errors.push('No JSON array or object found in response_reference content')
    return []
  }

  if (jsonMatches.length > 1) {
    errors.push('Warning: Multiple JSON structures found in response_reference, using first one')
  }

  try {
    const jsonContent = jsonMatches[0]

    // Check if it's an array or object
    if (jsonContent.startsWith('[')) {
      // It's an array
      const criteria = JSON.parse(jsonContent)
      if (!Array.isArray(criteria)) {
        errors.push('Invalid JSON in response_reference: Expected array, got ' + typeof criteria)
        return []
      }
      return criteria
    } else {
      // It's a single object, wrap it in an array
      const singleObject = JSON.parse(jsonContent)
      return [singleObject]
    }
  } catch (error) {
    errors.push(`Invalid JSON in response_reference: ${error.message}`)
    return []
  }

  if (jsonMatches.length > 1) {
    errors.push('Warning: Multiple JSON arrays found in response_reference, using first one')
  }

  try {
    const criteria = JSON.parse(jsonMatches[0])
    if (!Array.isArray(criteria)) {
      errors.push('Invalid JSON in response_reference: Expected array, got ' + typeof criteria)
      return []
    }
    return criteria
  } catch (error) {
    errors.push(`Invalid JSON in response_reference: ${error.message}`)
    return []
  }
}
