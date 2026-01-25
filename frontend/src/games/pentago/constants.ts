/**
 * Pentago game-specific constants
 */

// Board configuration
export const BOARD_SIZE = 8;
export const QUADRANT_SIZE = 4;
export const QUADRANT_COUNT = 4;

// Game configuration
export const WIN_LENGTH = 4; // Connect 4 to win

// Move types
export const MOVE_TYPES = {
  PLACE_AND_ROTATE: 'pentago_move'
} as const;

// Quadrant names and colors
export const QUADRANT_INFO = {
  0: { name: 'Red', color: '#ff0000' },
  1: { name: 'Blue', color: '#0000ff' },
  2: { name: 'Green', color: '#00ff00' },
  3: { name: 'Yellow', color: '#ffff00' }
} as const;

// Rotation directions
export const ROTATION_DIRECTIONS = {
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
} as const;

export type RotationDirection = typeof ROTATION_DIRECTIONS[keyof typeof ROTATION_DIRECTIONS];
