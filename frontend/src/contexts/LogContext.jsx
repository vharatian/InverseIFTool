import React, { createContext, useContext, useState } from 'react'
import PropTypes from 'prop-types'

/**
 * Log message types
 * @typedef {'info'|'success'|'warning'|'error'} LogLevel
 */

/**
 * Log message structure
 * @typedef {Object} LogMessage
 * @property {number} timestamp - Unix timestamp when message was created
 * @property {LogLevel} type - Type of the message
 * @property {string} content - Message content
 * @property {string} [source] - Optional source identifier
 */

/**
 * Log context for centralized message management
 */
const LogContext = createContext()

/**
 * Hook to use the log context
 * @returns {Object} Log context methods and state
 */
export const useLog = () => {
  const context = useContext(LogContext)
  if (!context) {
    throw new Error('useLog must be used within a LogProvider')
  }
  return context
}

/**
 * Log provider component that manages message state
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} [props.maxMessages=100] - Maximum number of messages to keep
 */
export const LogProvider = ({ children, maxMessages = 100 }) => {
  const [messages, setMessages] = useState([])

  /**
   * Add a new message to the log
   * @param {string} content - Message content
   * @param {LogLevel} [type='info'] - Message type
   * @param {string} [source] - Optional source identifier
   */
  const addMessage = (content, type = 'info', source = '') => {
    const message = {
      timestamp: Date.now(),
      type,
      content,
      source: source || 'system'
    }

    setMessages(prev => {
      const newMessages = [...prev, message]
      // Keep only the last maxMessages messages
      return newMessages.slice(-maxMessages)
    })
  }

  /**
   * Clear all messages from the log
   */
  const clearMessages = () => {
    setMessages([])
  }

  /**
   * Get messages filtered by type
   * @param {LogLevel[]} [types] - Types to include, if not provided returns all
   * @returns {LogMessage[]} Filtered messages
   */
  const getMessagesByType = (types) => {
    if (!types || types.length === 0) return messages
    return messages.filter(msg => types.includes(msg.type))
  }

  /**
   * Get messages from a specific source
   * @param {string} source - Source identifier
   * @returns {LogMessage[]} Messages from the source
   */
  const getMessagesBySource = (source) => {
    return messages.filter(msg => msg.source === source)
  }

  const value = {
    messages,
    addMessage,
    clearMessages,
    getMessagesByType,
    getMessagesBySource,
    maxMessages
  }

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  )
}

LogProvider.propTypes = {
  children: PropTypes.node.isRequired,
  maxMessages: PropTypes.number
}