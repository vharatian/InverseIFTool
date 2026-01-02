import { createContext, useContext, useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

const SocketContext = createContext(undefined)

export const SocketProvider = ({ children, token }) => {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    if (token && !socketRef.current) {
      // Create persistent socket connection
      // Use explicit backend URL for WebSocket connection

      const socket = io('/', {
        path: '/socket.io',
        transports: ['websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      })

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id)
        setIsConnected(true)
      })

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason)
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error)
        setIsConnected(false)
      })

      socket.on('reconnect', (attemptNumber) => {
        console.log('[Socket] Reconnected after', attemptNumber, 'attempts')
        setIsConnected(true)
      })

      socket.on('reconnect_error', (error) => {
        console.error('[Socket] Reconnection failed:', error)
      })

      socket.on('reconnect_failed', () => {
        console.error('[Socket] Reconnection failed completely')
        setIsConnected(false)
      })

      socket.on('reconnecting', (attemptNumber) => {
        console.log('[Socket] Reconnecting, attempt', attemptNumber)
      })

      socketRef.current = socket
    } else if (!token && socketRef.current) {
      // Disconnect when token is removed
      console.log('[Socket] Disconnecting due to logout')
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('[Socket] Cleaning up connection')
        socketRef.current.disconnect()
        socketRef.current = null
        setIsConnected(false)
      }
    }
  }, [token])

  const value = {
    socket: socketRef.current,
    isConnected,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
