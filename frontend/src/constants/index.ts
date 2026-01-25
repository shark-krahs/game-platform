/**
 * Main constants index - exports all application constants
 */

// Colors
export * from './colors.js'

// Layout constants
export const BOARD_SIZE = 8
export const CELL_SIZE = 40
export const QUADRANT_SIZE = 4
export const TIMERS_PANEL_WIDTH = 300
export const GAME_PADDING = 20
export const QUADRANT_GAP = 2

// Layout grid constants
export const QUADRANT_GRID_COLUMNS = 2
export const QUADRANT_GRID_GAP = 2
export const BOARD_GRID_COLUMNS = 2
export const BOARD_GRID_GAP = 4

// Border constants
export const CELL_BORDER_WIDTH = 1
export const QUADRANT_BORDER_WIDTH = 2
export const TIMER_BORDER_WIDTH = 1
export const FORM_BORDER_WIDTH = 1

// Border radius constants
export const CELL_BORDER_RADIUS = 2
export const QUADRANT_BORDER_RADIUS = 4
export const TIMER_BORDER_RADIUS = 4
export const FORM_BORDER_RADIUS = 4

// Timer constants
export const TIMER_HEIGHT = 60
export const FORM_PADDING = 16

// Game constants
export const GAME_STATUS = {
  WAITING: 'waiting',
  FIRST_MOVE: 'first_move',
  PLAYING: 'playing',
  DISCONNECT_WAIT: 'disconnect_wait',
  FINISHED: 'finished',
  ABANDONED: 'abandoned'
} as const

export type GameStatus = typeof GAME_STATUS[keyof typeof GAME_STATUS]

// API constants
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const

export const REQUEST_TIMEOUT = 10000 // 10 seconds

// WebSocket constants
export const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
} as const

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  THEME: 'theme',
  USER_PREFERENCES: 'user_preferences',
  GAME_SETTINGS: 'game_settings'
} as const

// Validation constants
export const VALIDATION_RULES = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 8,
  GAME_TIME_MIN: 1,
  GAME_TIME_MAX: 300,
  INCREMENT_MIN: 0,
  INCREMENT_MAX: 60
} as const

// Move constraints
export const MOVE_CONSTRAINTS = {
  MIN_COORDINATE: 0,
  MAX_COORDINATE: BOARD_SIZE - 1,
  VALID_DIRECTIONS: ['clockwise', 'counterclockwise'] as const
} as const

export type MoveDirection = typeof MOVE_CONSTRAINTS.VALID_DIRECTIONS[number]

// Time controls (presets)
export const TIME_CONTROLS = {
  BULLET: { initial: 60, increment: 0 },      // 1 minute
  BLITZ: { initial: 180, increment: 2 },      // 3+2
  RAPID: { initial: 600, increment: 0 },      // 10 minutes
  CLASSICAL: { initial: 2700, increment: 30 } // 45+30
} as const

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500
} as const

// Z-index layers
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 1000,
  MODAL: 2000,
  TOOLTIP: 3000,
  NOTIFICATION: 4000
} as const

// Breakpoints for responsive design
export const BREAKPOINTS = {
  MOBILE: '576px',
  TABLET: '768px',
  DESKTOP: '1024px',
  LARGE: '1200px'
} as const

// Default values
export const DEFAULTS = {
  THEME: 'light' as const,
  LANGUAGE: 'en' as const,
  TIME_CONTROL: TIME_CONTROLS.BLITZ,
  BOARD_SIZE,
  CELL_SIZE
} as const
