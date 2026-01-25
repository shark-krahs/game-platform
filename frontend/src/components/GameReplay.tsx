import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Button, Slider, message, Spin } from 'antd';
import { LeftOutlined, RightOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import GameBoard from './game/GameBoard';
import GameTimers from './game/GameTimers';
import { getGameEngine } from '../games/registry';
import savedGamesApi from '../services/savedGamesApi';
import { SavedGameDetail, GameState, GameStatus, Player } from '../types';

const GameReplay: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [savedGame, setSavedGame] = useState<SavedGameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSavedGame();
  }, [gameId]);

  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentMoveIndex(prev => {
          const maxMoves = savedGame?.moves.length || 0;
          if (prev >= maxMoves) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000); // Move every second
      setPlayInterval(interval);
    } else {
      if (playInterval) {
        clearInterval(playInterval);
        setPlayInterval(null);
      }
    }

    return () => {
      if (playInterval) {
        clearInterval(playInterval);
      }
    };
  }, [isPlaying]); // Removed savedGame?.moves.length dependency

  const loadSavedGame = async () => {
    if (!gameId) return;

    try {
      setLoading(true);
      const game = await savedGamesApi.getSavedGame(gameId);
      setSavedGame(game);
    } catch (error) {
      console.error('Failed to load saved game:', error);
      message.error('Failed to load saved game');
      navigate('/saved-games');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentGameState = useCallback((): GameState => {
    if (!savedGame) {
      return {
        id: '',
        status: 'finished' as GameStatus,
        board: [],
        currentPlayer: 0,
        players: [],
        created_at: '',
      };
    }

    // For replay, we need to reconstruct the board state from moves
    // Start with initial empty state and apply moves up to currentMoveIndex
    let currentBoardState = savedGame.board_state;
    let currentPlayer = savedGame.current_player;
    let status: GameStatus = currentMoveIndex === 0 ? 'waiting' : 'playing';
    let winner = savedGame.winner;

    // If we have moves with board_state_after, use them to reconstruct state
    if (savedGame.moves && savedGame.moves.length > 0) {
      // Find the move that corresponds to currentMoveIndex - 1 (after that move)
      const targetMoveIndex = currentMoveIndex - 1;
      if (targetMoveIndex >= 0 && targetMoveIndex < savedGame.moves.length) {
        const move = savedGame.moves[targetMoveIndex];
        if (move && move.board_state_after !== undefined && move.board_state_after !== null) {
          try {
            // Use the board state after this move
            currentBoardState = typeof move.board_state_after === 'string'
              ? JSON.parse(move.board_state_after)
              : move.board_state_after;

            // Set current player to the player who made the next move
            if (targetMoveIndex + 1 < savedGame.moves.length) {
              currentPlayer = savedGame.moves[targetMoveIndex + 1]!.player_id;
            } else {
              // Last move, current player is the one who would move next
              currentPlayer = (move.player_id + 1) % savedGame.players.length;
            }
          } catch (error) {
            console.error('Failed to parse board state from move:', error);
          }
        }
      } else if (targetMoveIndex === -1) {
        // Before any moves - we need initial state
        currentBoardState = getInitialBoardState(savedGame.game_type);
        currentPlayer = savedGame.current_player; // Initial player
      }
    }

    // If we've reached the end, set status to finished
    if (currentMoveIndex >= savedGame.moves.length) {
      status = 'finished';
    }

    // For pentago, extract grid from board_state for the board field
    let board = [];
    if (savedGame.game_type === 'pentago' && currentBoardState && currentBoardState.grid) {
      board = currentBoardState.grid;
    }

    return {
      id: savedGame.id,
      status,
      board: board,
      board_state: currentBoardState,
      currentPlayer: currentPlayer,
      players: savedGame.players,
      winner: winner !== undefined ? savedGame.players[winner]?.name : undefined,
      created_at: savedGame.created_at,
      game_type: savedGame.game_type,
    };
  }, [savedGame, currentMoveIndex]);

  const getInitialBoardState = (gameType: string) => {
    // Return initial board state for the game type
    if (gameType === 'pentago') {
      return {
        'grid': Array(6).fill(null).map(() => Array(6).fill(0)),
        'last_move': null,
        'move_count': 0
      };
    } else if (gameType === 'tetris') {
      return {
        'grid': Array(20).fill(null).map(() => Array(10).fill(0)),
        'next_pieces': [],
        'scores': [0, 0],
        'falling_piece': null,
        'held_piece': null,
        'can_hold': true
      };
    }
    return {};
  };

  const handleMoveChange = (value: number) => {
    setCurrentMoveIndex(value);
    setIsPlaying(false);
  };

  const handlePreviousMove = () => {
    setCurrentMoveIndex(prev => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNextMove = () => {
    if (!savedGame) return;
    setCurrentMoveIndex(prev => Math.min(savedGame.moves.length, prev + 1));
    setIsPlaying(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getPlayers = (players: Player[]): { me: Player | null; opponent: Player | null } => {
    // For replay, we don't have a "me", so return first two players
    if (!Array.isArray(players) || players.length < 2) {
      return { me: null, opponent: null };
    }
    return { me: players[0] || null, opponent: players[1] || null };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading saved game...</p>
      </div>
    );
  }

  if (!savedGame) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Game not found</h2>
        <Button onClick={() => navigate('/saved-games')}>Back to Saved Games</Button>
      </div>
    );
  }

  const engine = getGameEngine(savedGame.game_type);
  const gameState = getCurrentGameState();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <h1>{savedGame.title}</h1>
        <p>{savedGame.game_type} - {savedGame.players.map(p => p.name).join(' vs ')}</p>
      </div>

      <Row gutter={[16, 16]}>
        {/* Timers */}
        <Col xs={24} lg={8} xl={6}>
          <GameTimers
            status={gameState.status}
            firstMoveTimer={0}
            firstMovePlayer={null}
            disconnectTimer={0}
            disconnectedPlayer={null}
            players={gameState.players}
            turn={gameState.currentPlayer}
            formatTime={formatTime}
            getPlayers={getPlayers}
            gameType={savedGame.game_type}
          />
        </Col>

        {/* Game board */}
        <Col xs={24} lg={16} xl={18}>
          {engine ? (
            <GameBoard
              engine={engine}
              gameState={gameState}
              onCellClick={() => {}} // Disable interaction in replay
              selectedCell={null}
              selectedQuadrant={null}
              selectedDirection={null}
              readOnly
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              Game engine not available for {savedGame.game_type}
            </div>
          )}

          {/* Replay controls */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
              <Button
                icon={<LeftOutlined />}
                onClick={handlePreviousMove}
                disabled={currentMoveIndex === 0}
              >
                Previous
              </Button>

              <Button
                type={isPlaying ? "default" : "primary"}
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={togglePlay}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </Button>

              <Button
                icon={<RightOutlined />}
                onClick={handleNextMove}
                disabled={currentMoveIndex >= savedGame.moves.length}
              >
                Next
              </Button>
            </div>

            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <Slider
                min={0}
                max={savedGame.moves.length}
                value={currentMoveIndex}
                onChange={handleMoveChange}
                tooltip={{
                  formatter: (value) => `Move ${value} of ${savedGame.moves.length}`
                }}
              />
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                Move {currentMoveIndex} of {savedGame.moves.length}
              </div>
            </div>
          </div>

          {/* Game status */}
          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.1em' }}>
              <b>Status:</b> {gameState.status}
            </div>
            {gameState.winner && (
              <div style={{ marginTop: '8px', fontSize: '1.2em', fontWeight: 'bold' }}>
                Winner: {gameState.winner}
              </div>
            )}
          </div>
        </Col>
      </Row>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Button onClick={() => navigate('/saved-games')}>
          Back to Saved Games
        </Button>
      </div>
    </div>
  );
};

export default GameReplay;
