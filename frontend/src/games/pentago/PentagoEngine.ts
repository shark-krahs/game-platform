import { GameEngine, Move, GameState, Position, MoveFormProps } from '../../types';
import PentagoBoard from './PentagoBoard';
import MoveForm from '../../components/game/MoveForm';
import { BOARD_SIZE, MOVE_TYPES, QUADRANT_INFO, ROTATION_DIRECTIONS } from './constants';

export class PentagoEngine implements GameEngine {
  id = 'pentago';
  name = 'Pentago';
  boardComponent = PentagoBoard;
  moveFormComponent = MoveForm;

  getInitialBoard(): number[][] {
    return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  }

  moveValidator(move: Move, state: GameState): boolean {
    if (move.type !== 'pentago_move') return false;

    const { x, y, quadrant, direction } = move.data;

    // Check bounds
    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) return false;

    // Check if cell exists and is empty
    if (!state.board[y] || state.board[y][x] !== null) return false;

    // Check if quadrant is valid (0-3)
    if (quadrant < 0 || quadrant > 3) return false;

    // Check if direction is valid
    if (direction !== 'clockwise' && direction !== 'counterclockwise') return false;

    return true;
  }

  getValidMoves(state: GameState): Move[] {
    const moves: Move[] = [];

    // For each empty cell
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (!state.board[y]) continue;
      for (let x = 0; x < BOARD_SIZE; x++) {
        if (state.board[y]![x] === null) {
          // For each quadrant and direction
          for (let quadrant = 0; quadrant < 4; quadrant++) {
            ['clockwise', 'counterclockwise'].forEach(direction => {
              moves.push({
                type: 'pentago_move',
                data: { x, y, quadrant, direction },
              });
            });
          }
        }
      }
    }

    return moves;
  }

  createMove(gameState: GameState, selectedData: any): Move | null {
    const { selectedCell, selectedQuadrant, selectedDirection } = selectedData;

    if (!selectedCell || selectedQuadrant === null || !selectedDirection) {
      return null;
    }

    return {
      type: 'pentago_move',
      data: {
        x: selectedCell.x,
        y: selectedCell.y,
        quadrant: selectedQuadrant,
        direction: selectedDirection,
      },
    };
  }

  getMoveFormProps(gameState: GameState, selectedData: any, handlers: any): MoveFormProps {
    const { selectedCell, selectedQuadrant, selectedDirection } = selectedData;
    const { onQuadrantSelect, onDirectionSelect, onMoveSubmit, onMoveCancel } = handlers;

    return {
      selectedCell,
      selectedQuadrant,
      selectedDirection,
      handleQuadrantSelect: onQuadrantSelect,
      handleDirectionSelect: onDirectionSelect,
      sendMove: onMoveSubmit,
      cancelMove: onMoveCancel,
      getQuadrantName: (quadrant: number) => QUADRANT_INFO[quadrant as keyof typeof QUADRANT_INFO]?.name || 'Unknown',
    };
  }
}
