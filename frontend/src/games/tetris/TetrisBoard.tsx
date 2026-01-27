import React, { useState, useEffect, useCallback } from 'react';
import { GameBoardProps, Move } from '../../types';
import { BOARD_WIDTH, BOARD_HEIGHT, TETROMINOES, PIECE_COLORS } from './constants';
import { useAuth } from '../../AuthContext';

const TetrisBoard: React.FC<GameBoardProps> = ({
  gameState,
  onMoveSubmit,
  readOnly = false,
}) => {
  const { user } = useAuth();

  // Safety check - only render for Tetris games
  if (gameState.game_type !== 'tetris') {
    return (
      <div style={{ padding: '20px', color: '#fff' }}>
        <h3>Error: Wrong game type</h3>
        <p>This component is for Tetris games only. Game type: {gameState.game_type}</p>
      </div>
    );
  }

  // Determine if it's the current player's turn
  const isPlayerTurn =
    !readOnly &&
    gameState.players.length > 0 &&
    gameState.players[gameState.currentPlayer]?.name === user?.username;

  const currentPlayerName = gameState.players[gameState.currentPlayer]?.name || `Player ${gameState.currentPlayer + 1}`;

  // Get data from backend
  const gameBoard = gameState.board_state?.grid || Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
  const fallingPiece = gameState.board_state?.falling_piece || null;

  const canPlacePiece = useCallback((piece: any, x: number, y: number, rotation: number): boolean => {
    const tetromino = TETROMINOES[piece.type as keyof typeof TETROMINOES];
    if (!tetromino) return false;

    // Convert readonly to mutable and rotate the piece
    let rotatedPiece: number[][] = tetromino.map(row => [...row]);
    for (let i = 0; i < rotation; i++) {
      rotatedPiece = rotatePiece90Clockwise(rotatedPiece);
    }

    // Check bounds and collisions
    for (let py = 0; py < rotatedPiece.length; py++) {
      const row = rotatedPiece[py];
      if (!row) continue;
      for (let px = 0; px < row.length; px++) {
        if (row[px] === 1) {
          const boardX = x + px;
          const boardY = y + py;

          // Check bounds
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return false;
          }

          // Check collision (only if within bounds)
          if (boardY >= 0 && gameBoard[boardY] && gameBoard[boardY][boardX] !== 0) {
            return false;
          }
        }
      }
    }

    return true;
  }, [gameBoard]);

  const rotatePiece90Clockwise = (piece: number[][]): number[][] => {
    const size = piece.length;
    const rotated: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));

    for (let y = 0; y < size; y++) {
      const row = piece[y];
      if (!row) continue;
      for (let x = 0; x < size; x++) {
        const rotatedRow = rotated[x];
        const value = row[x];
        if (rotatedRow && value !== undefined) {
          rotatedRow[size - 1 - y] = value;
        }
      }
    }

    return rotated;
  };

  const movePiece = useCallback((direction: 'left' | 'right' | 'down' | 'rotate') => {
    if (!fallingPiece || !onMoveSubmit || readOnly) return;

    // Send move command to backend
    const move: Move = {
      type: 'tetris_move',
      data: {
        action: 'move',
        direction: direction,
      },
    };

    onMoveSubmit(move);
  }, [fallingPiece, onMoveSubmit]);

  const placePiece = useCallback(() => {
    if (!onMoveSubmit || readOnly) return;

    // Send lock command to backend
    const move: Move = {
      type: 'tetris_move',
      data: {
        action: 'lock',
      },
    };

    onMoveSubmit(move);
  }, [onMoveSubmit]);

  // Keyboard controls
  useEffect(() => {
    if (readOnly) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (!fallingPiece) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          movePiece('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          movePiece('right');
          break;
        case 'ArrowDown':
          event.preventDefault();
          placePiece();
          break;
        case ' ': // Spacebar for rotation
          event.preventDefault();
          movePiece('rotate');
          break;
        case 'Enter':
          event.preventDefault();
          placePiece();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [fallingPiece, movePiece, placePiece, readOnly]);

  // Auto-drop piece every second (only if it's player's turn)
  useEffect(() => {
    if (!fallingPiece || gameState.status !== 'playing' || !isPlayerTurn) return;

    const interval = setInterval(() => {
      movePiece('down');
    }, 1000);

    return () => clearInterval(interval);
  }, [fallingPiece, movePiece, gameState.status, isPlayerTurn]);

  const renderCell = (x: number, y: number) => {
    const boardRow = gameBoard[y];
    if (!boardRow) return null;

    let cellValue = boardRow[x];
    let cellColor = '#000';

    // Check if this cell is part of the falling piece
    if (fallingPiece) {
      const tetromino = TETROMINOES[fallingPiece.type as keyof typeof TETROMINOES];
      if (tetromino) {
        // Convert readonly to mutable and rotate
        let rotatedPiece: number[][] = tetromino.map(row => [...row]);
        for (let i = 0; i < fallingPiece.rotation; i++) {
          rotatedPiece = rotatePiece90Clockwise(rotatedPiece);
        }

        const pieceX = x - fallingPiece.x;
        const pieceY = y - fallingPiece.y;

        if (pieceX >= 0 && pieceX < (rotatedPiece[0]?.length || 0) &&
            pieceY >= 0 && pieceY < rotatedPiece.length &&
            (rotatedPiece[pieceY]?.[pieceX] || 0) > 0) {
          cellColor = PIECE_COLORS[fallingPiece.type as keyof typeof PIECE_COLORS] || '#fff';
          cellValue = 1; // Mark as occupied by falling piece
        }
      }
    }

    // If not falling piece, use board value
    if (cellValue === 0) {
      cellColor = '#000';
    } else if (cellValue && cellValue > 0) {
      // Player pieces (1 = player 1, 2 = player 2)
      cellColor = cellValue === 1 ? '#ff0000' : '#0000ff';
    }

    return (
      <div
        key={`${x}-${y}`}
        style={{
          width: 'var(--tetris-cell-size)',
          height: 'var(--tetris-cell-size)',
          border: '1px solid #333',
          backgroundColor: cellColor,
        }}
      />
    );
  };

  return (
    <div className="tetris-board" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Game Board */}
      <div>
        <h3 style={{ color: '#fff', marginBottom: '10px' }}>
          Tetris for Two
          {isPlayerTurn && fallingPiece && (
            <span style={{ color: '#4CAF50', marginLeft: '10px' }}>
              Your Turn
            </span>
          )}
        </h3>
        <div
          className="tetris-board__grid"
          style={{
            gridTemplateColumns: `repeat(${BOARD_WIDTH}, var(--tetris-cell-size))`,
          }}
        >
          {Array.from({ length: BOARD_HEIGHT }, (_, y) =>
            Array.from({ length: BOARD_WIDTH }, (_, x) => renderCell(x, y))
          )}
        </div>
      </div>

      {/* Control Buttons - Mobile Friendly */}
        {fallingPiece && isPlayerTurn && !readOnly && (
          <div style={{ marginTop: '20px' }}>
            {/* Movement Controls */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '15px',
              maxWidth: '200px',
              margin: '0 auto 15px auto'
            }}>
              <div></div> {/* Empty space for centering */}
              <button onClick={() => movePiece('rotate')} style={rotateButtonStyle}>↻</button>
              <div></div> {/* Empty space for centering */}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
              marginBottom: '15px',
              maxWidth: '200px',
              margin: '0 auto 15px auto'
            }}>
              <button onClick={() => movePiece('left')} style={directionButtonStyle}>←</button>
              <button onClick={placePiece} style={downButtonStyle}>↓</button>
              <button onClick={() => movePiece('right')} style={directionButtonStyle}>→</button>
            </div>
          </div>
        )}

      {/* Controls and Info */}
      <div style={{ color: '#fff', minWidth: '220px', flex: '1 1 220px' }}>
        <h3 style={{ marginBottom: '15px' }}>Controls</h3>

        {/* Keyboard Instructions */}
        <div style={{ marginBottom: '20px', fontSize: '12px', color: '#ccc' }}>
          <strong>Controls:</strong><br/>
          ←→: Move piece<br/>
          ↓: Lock piece<br/>
          Space: Rotate
        </div>

        {/* Current Piece Info */}
        {fallingPiece && (
          <div style={{ marginBottom: '15px' }}>
            <strong>Current Piece:</strong> {fallingPiece.type}
          </div>
        )}

        {/* Game Info */}
        <div style={{ borderTop: '1px solid #555', paddingTop: '15px' }}>
          <h4 style={{ marginBottom: '10px' }}>Game Status</h4>
          <p><strong>Status:</strong> {gameState.status}</p>
          <p><strong>Current Player:</strong> {currentPlayerName}</p>
          <p><strong>Players:</strong> {gameState.players.length}</p>

          {/* Hide next pieces for cleaner UI */}

          {/* Scores */}
          {gameState.board_state?.scores && (
            <div style={{ marginTop: '15px' }}>
              <strong>Scores:</strong>
              {gameState.board_state.scores.map((score: number, index: number) => (
                <div key={index} style={{ color: index === 0 ? '#ff0000' : '#0000ff' }}>
                  {gameState.players[index]?.name || `Player ${index + 1}`}: {score} pts
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const controlButtonStyle = {
  padding: '8px',
  backgroundColor: '#555',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px'
};

// Mobile-friendly button styles
const rotateButtonStyle = {
  ...controlButtonStyle,
  width: '60px',
  height: '60px',
  fontSize: '24px',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#2196F3',
};

const directionButtonStyle = {
  ...controlButtonStyle,
  width: '60px',
  height: '60px',
  fontSize: '24px',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const downButtonStyle = {
  ...directionButtonStyle,
  backgroundColor: '#FF9800',
};

// Lock action now mapped to down arrow for mobile

export default TetrisBoard;
