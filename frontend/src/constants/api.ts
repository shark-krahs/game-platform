/**
 * API-related constants and configuration
 */

import type { ApiResponse, PaginatedResponse } from '../types'

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me'
  },
  GAMES: {
    LIST: '/api/games',
    CREATE: '/api/games',
    JOIN: (id: string) => `/api/games/${id}/join`,
    MOVE: (id: string) => `/api/games/${id}/move`,
    STATUS: (id: string) => `/api/games/${id}/status`,
    QUIT: (id: string) => `/api/games/${id}/quit`
  },
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE_PROFILE: '/api/users/profile',
    RATINGS: (userId: string) => `/api/users/${userId}/ratings`
  },
  LOBBY: {
    MATCHMAKING: '/api/lobby/matchmaking'
  }
} as const

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
} as const

export type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const

// Request timeout
export const REQUEST_TIMEOUT = 10000 // 10 seconds

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 10000  // 10 seconds
} as const

// API response types
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface ApiMeta {
  timestamp: string
  requestId: string
  version: string
}

// WebSocket events
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Game events
  GAME_START: 'game:start',
  GAME_MOVE: 'game:move',
  GAME_END: 'game:end',
  GAME_UPDATE: 'game:update',

  // Lobby events
  LOBBY_JOIN: 'lobby:join',
  LOBBY_LEAVE: 'lobby:leave',
  MATCH_FOUND: 'match:found',

  // User events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline'
} as const

export type WsEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS]

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  // Client to server
  JOIN_GAME: 'join_game',
  MAKE_MOVE: 'make_move',
  LEAVE_GAME: 'leave_game',
  SEND_MESSAGE: 'send_message',

  // Server to client
  GAME_STATE: 'game_state',
  MOVE_MADE: 'move_made',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  GAME_OVER: 'game_over',
  ERROR: 'error',
  CHAT_MESSAGE: 'chat_message'
} as const

export type WsMessageType = typeof WS_MESSAGE_TYPES[keyof typeof WS_MESSAGE_TYPES]

// API configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000',

  // Request headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  // CORS configuration
  CORS: {
    credentials: 'include' as RequestCredentials,
    mode: 'cors' as RequestMode
  }
} as const

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  LONG_TTL: 30 * 60 * 1000,   // 30 minutes
  SHORT_TTL: 60 * 1000        // 1 minute
} as const

// Rate limiting
export const RATE_LIMITS = {
  AUTH_REQUESTS: { max: 5, window: 60000 },    // 5 requests per minute
  GAME_MOVES: { max: 10, window: 10000 },      // 10 moves per 10 seconds
  API_REQUESTS: { max: 100, window: 60000 }    // 100 requests per minute
} as const
