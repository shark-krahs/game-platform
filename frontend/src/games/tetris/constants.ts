/**
 * Tetris game-specific constants
 */

// Board configuration
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

// Tetromino shapes (Tetris pieces)
export const TETROMINOES = {
    I: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
    ],
    O: [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0],
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0],
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0],
    ],
} as const;

export type TetrominoType = keyof typeof TETROMINOES;

// Move types
export const MOVE_TYPES = {
    PLACE_PIECE: 'tetris_move'
} as const;

// Game configuration
export const INITIAL_PIECE_QUEUE_SIZE = 5;
export const LINES_PER_LEVEL = 10;
export const BASE_DROP_TIME = 1000; // milliseconds
export const LOCK_DELAY = 500; // milliseconds

// Scoring
export const SCORE_VALUES = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2
} as const;

// Colors for pieces (can be used for visualization)
export const PIECE_COLORS = {
    I: '#00f5ff', // Cyan
    O: '#ffff00', // Yellow
    T: '#800080', // Purple
    S: '#00ff00', // Green
    Z: '#ff0000', // Red
    J: '#0000ff', // Blue
    L: '#ffa500'  // Orange
} as const;
