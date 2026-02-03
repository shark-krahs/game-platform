import { GameEngine, GameState, Move } from "../../types";
import TetrisBoard from "./TetrisBoard";
import { BOARD_HEIGHT, BOARD_WIDTH, TETROMINOES } from "./constants";

export class TetrisEngine implements GameEngine {
  id = "tetris";
  name = "Tetris for Two";
  boardComponent = TetrisBoard;

  getInitialBoard(): number[][] {
    return Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill(null));
  }

  moveValidator(move: Move, state: GameState): boolean {
    if (move.type !== "tetris_move") return false;

    const { action } = move.data;

    // Validate action type
    if (!["move", "lock"].includes(action)) return false;

    if (action === "move") {
      const { direction } = move.data;
      if (!["left", "right", "down", "rotate"].includes(direction))
        return false;
    }

    return true;
  }

  getValidMoves(state: GameState): Move[] {
    // For simplicity, return some basic moves
    // In real Tetris, this would generate all possible placements
    const moves: Move[] = [];
    const pieces = Object.keys(TETROMINOES);

    pieces.forEach((piece) => {
      for (let rotation = 0; rotation < 4; rotation++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
          for (let y = 0; y < BOARD_HEIGHT; y++) {
            if (
              this.canPlacePiece(
                state.board_state?.grid || [],
                piece,
                rotation,
                x,
                y,
              )
            ) {
              moves.push({
                type: "tetris_move",
                data: { piece, rotation, x, y, playerId: state.currentPlayer },
              });
            }
          }
        }
      }
    });

    return moves;
  }

  createMove(gameState: GameState, selectedData: any): Move | null {
    // Tetris doesn't use manual move creation like Pentago
    return null;
  }

  getMoveFormProps(
    gameState: GameState,
    selectedData: any,
    handlers: any,
  ): any {
    // Tetris doesn't use move form like Pentago
    return {};
  }

  private canPlacePiece(
    board: (number | null)[][],
    piece: string,
    rotation: number,
    x: number,
    y: number,
  ): boolean {
    const tetromino = TETROMINOES[piece as keyof typeof TETROMINOES];
    if (!tetromino) return false;

    // Convert readonly array to mutable for rotation
    const mutableTetromino = tetromino.map((row) => [...row]);

    // Rotate the piece
    const rotatedPiece = this.rotatePiece(mutableTetromino, rotation);

    // Check bounds and collisions
    for (let py = 0; py < rotatedPiece.length; py++) {
      if (!rotatedPiece[py]) continue;
      for (let px = 0; px < rotatedPiece[py]!.length; px++) {
        if (rotatedPiece[py]![px]) {
          const boardX = x + px;
          const boardY = y + py;

          // Check bounds
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }

          // Check collision (only if within bounds)
          if (boardY >= 0 && board[boardY] && board[boardY][boardX] !== null) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private rotatePiece(piece: number[][], rotations: number): number[][] {
    let result = piece;
    for (let i = 0; i < rotations; i++) {
      result = this.rotate90Clockwise(result);
    }
    return result;
  }

  private rotate90Clockwise(piece: number[][]): number[][] {
    const size = piece.length;
    const rotated = Array(size)
      .fill(null)
      .map(() => Array(size).fill(0));

    for (let y = 0; y < size; y++) {
      if (!piece[y]) continue;
      for (let x = 0; x < size; x++) {
        if (rotated[x] && piece[y] && piece[y]![x] !== undefined) {
          rotated[x]![size - 1 - y] = piece[y]![x];
        }
      }
    }

    return rotated;
  }
}
