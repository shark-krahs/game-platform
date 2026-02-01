/**
 * Color constants for the application
 */

// Quadrant colors (background)
export const QUADRANT_COLORS = {
    0: '#dd1414', // Red
    1: '#1414dd', // Blue
    2: '#14dd14', // Green
    3: '#dddd14'  // Yellow
} as const

export type QuadrantIndex = keyof typeof QUADRANT_COLORS;

// Player colors
export const PLAYER_COLORS = [
    '#4287f5', // Blue
    '#ff6b6b', // Red
    '#4ecdc4', // Teal
    '#ffe66d', // Yellow
    '#a8e6cf', // Light green
    '#dcedc8', // Light yellow
    '#ffd3b6', // Peach
    '#ffaaa5'  // Pink
] as const

// Status colors
export const STATUS_COLORS = {
    success: '#52c41a',
    error: '#ff4d4f',
    warning: '#faad14',
    info: '#1890ff'
} as const

// Timer colors
export const TIMER_COLORS = {
    normal: '#666',
    urgent: '#ff4d4f',
    active: '#52c41a'
} as const

// Type exports
export type QuadrantColorKey = keyof typeof QUADRANT_COLORS
export type PlayerColorIndex = keyof typeof PLAYER_COLORS
export type StatusColorKey = keyof typeof STATUS_COLORS
export type TimerColorKey = keyof typeof TIMER_COLORS
