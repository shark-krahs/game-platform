import {BOARD_SIZE, MOVE_CONSTRAINTS, QUADRANT_SIZE,} from '../constants';

/**
 * Check if coordinates are within board bounds
 */
export const isValidCoordinate = (x: number, y: number): boolean => {
    return (
        x >= MOVE_CONSTRAINTS.MIN_COORDINATE &&
        x <= MOVE_CONSTRAINTS.MAX_COORDINATE &&
        y >= MOVE_CONSTRAINTS.MIN_COORDINATE &&
        y <= MOVE_CONSTRAINTS.MAX_COORDINATE
    );
};

/**
 * Check if direction is valid
 */
export const isValidDirection = (direction: 'clockwise' | 'counterclockwise'): boolean => {
    return MOVE_CONSTRAINTS.VALID_DIRECTIONS.includes(direction);
};

/**
 * Get quadrant index from coordinates
 */
export const getQuadrantFromCoords = (x: number, y: number): number => {
    const quadrantX = Math.floor(x / QUADRANT_SIZE);
    const quadrantY = Math.floor(y / QUADRANT_SIZE);
    return quadrantY * 2 + quadrantX;
};

/**
 * Get quadrant name for display
 */
export const getQuadrantName = (quadrant: number): string => {
    const names = ['Top-Left', 'Top-Right', 'Bottom-Left', 'Bottom-Right'];
    return names[quadrant] ?? 'Unknown';
};

/**
 * Get quadrant color
 */
export const getQuadrantColor = (quadrant: number): string => {
    const colors = ['#dd1414', '#1414dd', '#14dd14', '#dddd14'];
    return colors[quadrant] ?? '#cccccc';
};

/**
 * Check if position is empty on board
 */
export const isPositionEmpty = (
    board: (number | null)[][],
    x: number,
    y: number
): boolean => {
    if (!isValidCoordinate(x, y)) return false;
    // Защита от undefined
    return board[y]?.[x] === null;
};

/**
 * Get all empty positions on board
 */
export const getEmptyPositions = (
    board: (number | null)[][]
): [number, number][] => {
    const emptyPositions: [number, number][] = [];
    for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) {
            if (board[y]?.[x] === null) {
                emptyPositions.push([x, y]);
            }
        }
    }
    return emptyPositions;
};

/**
 * Check if board is full
 */
export const isBoardFull = (board: (number | null)[][]): boolean => {
    return getEmptyPositions(board).length === 0;
};

/**
 * Get player color by index
 */
export const getPlayerColor = (playerIndex: number): string => {
    const colors = [
        '#ff0000',
        '#0000ff',
        '#00ff00',
        '#ffff00',
        '#ff00ff',
        '#00ffff',
        '#ffa500',
        '#800080',
    ];
    return colors[playerIndex % colors.length] ?? '#cccccc';
};

/**
 * Check if game has winner (4 in a row)
 */
export const checkWinner = (board: (number | null)[][]): number | null | undefined => {
    const size = BOARD_SIZE;

    // Horizontal
    for (let y = 0; y < size; y++) {
        for (let x = 0; x <= size - 4; x++) {
            const cell = board[y]?.[x];
            if (
                cell !== null &&
                board[y]?.[x + 1] === cell &&
                board[y]?.[x + 2] === cell &&
                board[y]?.[x + 3] === cell
            ) {
                return cell;
            }
        }
    }

    // Vertical
    for (let x = 0; x < size; x++) {
        for (let y = 0; y <= size - 4; y++) {
            const cell = board[y]?.[x];
            if (
                cell !== null &&
                board[y + 1]?.[x] === cell &&
                board[y + 2]?.[x] === cell &&
                board[y + 3]?.[x] === cell
            ) {
                return cell;
            }
        }
    }

    // Diagonal (top-left to bottom-right)
    for (let y = 0; y <= size - 4; y++) {
        for (let x = 0; x <= size - 4; x++) {
            const cell = board[y]?.[x];
            if (
                cell !== null &&
                board[y + 1]?.[x + 1] === cell &&
                board[y + 2]?.[x + 2] === cell &&
                board[y + 3]?.[x + 3] === cell
            ) {
                return cell;
            }
        }
    }

    // Diagonal (top-right to bottom-left)
    for (let y = 0; y <= size - 4; y++) {
        for (let x = 3; x < size; x++) {
            const cell = board[y]?.[x];
            if (
                cell !== null &&
                board[y + 1]?.[x - 1] === cell &&
                board[y + 2]?.[x - 2] === cell &&
                board[y + 3]?.[x - 3] === cell
            ) {
                return cell;
            }
        }
    }

    return null;
};

/**
 * Rotate 4x4 quadrant
 */
export const rotateQuadrant = (
    quadrant: (number | null)[][],
    direction: 'clockwise' | 'counterclockwise'
): (number | null | undefined)[][] => {
    const size = quadrant.length;
    const rotated: (number | null | undefined)[][] = Array.from({length: size}, () =>
        Array(size).fill(null)
    );

    for (let y = 0; y < size; y++) {
        const row = quadrant[y];
        if (!row) continue;
        for (let x = 0; x < size; x++) {
            if (direction === 'clockwise') {
                rotated[x]![size - 1 - y] = row[x];
            } else {
                rotated[size - 1 - x]![y] = row[x];
            }
        }
    }

    return rotated;
};

/**
 * Extract quadrant from full board
 */
export const extractQuadrant = (
    board: (number | null)[][],
    quadrantIndex: number
): (number | null | undefined)[][] => {
    const startY = quadrantIndex >= 2 ? QUADRANT_SIZE : 0;
    const startX = quadrantIndex % 2 === 1 ? QUADRANT_SIZE : 0;

    const quadrant: (number | null | undefined)[][] = [];
    for (let dy = 0; dy < QUADRANT_SIZE; dy++) {
        const row = board[startY + dy];
        quadrant[dy] = [];
        if (row) {
            for (let dx = 0; dx < QUADRANT_SIZE; dx++) {
                quadrant[dy]![dx] = row[startX + dx];
            }
        }
    }

    return quadrant;
};

/**
 * Place rotated quadrant back into board
 */
export const placeRotatedQuadrant = (
    board: (number | null | undefined)[][],
    quadrantIndex: number,
    rotatedQuadrant: (number | null | undefined)[][]
): (number | null | undefined)[][] => {
    const startY = quadrantIndex >= 2 ? QUADRANT_SIZE : 0;
    const startX = quadrantIndex % 2 === 1 ? QUADRANT_SIZE : 0;

    const newBoard = board.map((row) => (row ? [...row] : []));

    for (let dy = 0; dy < QUADRANT_SIZE; dy++) {
        const targetRow = newBoard[startY + dy];
        const sourceRow = rotatedQuadrant[dy];
        if (targetRow && sourceRow) {
            for (let dx = 0; dx < QUADRANT_SIZE; dx++) {
                targetRow[startX + dx] = sourceRow[dx];
            }
        }
    }

    return newBoard;
};