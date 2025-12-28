import { openaiClient } from './openai-client.js'

/**
 * Simple LLM call function
 * @param {Object} options - Chat completion options
 * @param {string} prompt - The prompt to send to the LLM
 * @returns {Promise<string>} - The text content of the response
 */
export async function llmCall(options = {}, prompt) {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Prompt is required and must be a string')
  }

  try {
    const response = await openaiClient.simpleChatCompletion(prompt, options)
    return response
  } catch (error) {
    console.error('LLM Call Error:', error)
    throw new Error(`Failed to get LLM response: ${error.message}`)
  }
}

/**
 * Advanced LLM call function with full control over messages
 * @param {Array} messages - Array of message objects with role and content
 * @param {Object} options - Chat completion options
 * @returns {Promise<string>} - The text content of the response
 */
export async function llmCallAdvanced(messages, options = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required and must not be empty')
  }

  try {
    const response = await openaiClient.createChatCompletion(messages, options)
    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Advanced LLM Call Error:', error)
    throw new Error(`Failed to get LLM response: ${error.message}`)
  }
}

// Export the client for direct access if needed
export { openaiClient }
