import React, { useState, useEffect } from 'react';
import { Location, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../hooks/useWebSocket';
import { Row, Col, Button } from 'antd';
import GameBoard from './game/GameBoard';
import GameTimers from './game/GameTimers';
import MessageLog from './MessageLog';
import { getGameEngine } from '../games/registry';
import {
  TIMERS_PANEL_WIDTH,
} from '../constants';
import { GameState, Player, GameStatus, Move, Position } from '../types';

const GameClient: React.FC = () => {
  const { user, token: authToken } = useAuth();
  const { t } = useTranslation('gameClient');
  const navigate = useNavigate();
  const location: Location = useLocation();
  const { gameId: urlGameId } = useParams<{ gameId: string }>();

  const [playerColor, setPlayerColor] = useState<string>(
    user?.preferred_color || '#ff0000'
  );

  // Получаем gameId из URL параметров (надежнее чем location.state)
  const gameId = urlGameId || (location.state as { gameId?: string } | null)?.gameId;
  const initialGameType = (location.state as { gameType?: string } | null)?.gameType || 'pentago';

  // Хуки игры
  const {
    connected,
    board,
    board_state,
    game_type,
    players,
    status,
    turn,
    current_player,
    winner,
    resetVotes,
    firstMoveTimer,
    firstMovePlayer,
    disconnectTimer,
    disconnectedPlayer,
    messages,
    error,
    sendMessage,
  } = useWebSocket(gameId, authToken, user, navigate, location);

  // State for dynamic engine selection
  const [currentGameType, setCurrentGameType] = useState<string>(initialGameType);

  // Update game type when received from WebSocket
  useEffect(() => {
    if (game_type && game_type !== currentGameType) {
      console.log('Updating game type from WebSocket:', game_type);
      setCurrentGameType(game_type);
    }
  }, [game_type, currentGameType]);

  // Получаем движок игры (динамически обновляется)
  const engine = getGameEngine(currentGameType);

  // Game-specific state management
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<'clockwise' | 'counterclockwise' | null>(null);



  // Handlers using engine
  const handleCell = (x: number, y: number, board: (number | null)[][], status: string) => {
    if (!board[y]?.[x] && (status === 'playing' || status === 'first_move' || status === 'disconnect_wait')) {
      setSelectedCell({ x, y });
    }
  };

  const handleQuadrantSelect = (quadrant: number) => {
    setSelectedQuadrant(quadrant);
  };

  const handleDirectionSelect = (direction: 'clockwise' | 'counterclockwise') => {
    setSelectedDirection(direction);
  };

  const sendMove = () => {
    if (!engine || !selectedCell) return;

    const selectedData = { selectedCell, selectedQuadrant, selectedDirection };
    const move = engine.createMove(gameState, selectedData);

    if (move && engine.moveValidator(move, gameState)) {
      sendMessage({
        type: 'move',
        ...move.data,
      });
      // Reset selection
      setSelectedCell(null);
      setSelectedQuadrant(null);
      setSelectedDirection(null);
    }
  };

  const cancelMove = () => {
    setSelectedCell(null);
    setSelectedQuadrant(null);
    setSelectedDirection(null);
  };

  const resetGame = () => {
    sendMessage({ type: 'reset' });
  };



  // Utility functions
  const getQuadrantName = (quadrant: number): string => {
    const names = [t('quadrantRed'), t('quadrantBlue'), t('quadrantGreen'), t('quadrantYellow')];
    return names[quadrant] || t('unknownQuadrant');
  };

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getPlayers = (players: Player[]): { me: Player | null; opponent: Player | null } => {
    if (!Array.isArray(players)) {
      return { me: null, opponent: null };
    }

    const me = players.find((p) => p?.name === user?.username) || null;
    const opponent = players.find((p) => p?.name !== user?.username) || null;

    return { me, opponent };
  };

  const isResetPending = (resetVotes: (number | string)[]): boolean => {
    if (!user?.id) return false;
    const myUserId = user.id.toString();
    return resetVotes.includes(myUserId);
  };

  // Обновляем цвет игрока, если пришёл из matchmaking
  useEffect(() => {
    if ((location.state as { color?: 'white' | 'black' } | null)?.color) {
      const colorMap: Record<'white' | 'black', string> = {
        white: '#ffffff',
        black: '#000000',
      };
      const newColor =
        colorMap[(location.state as { color: 'white' | 'black' }).color];
      setPlayerColor(newColor);
    }
  }, [location.state]);

  // Загрузка / ожидание подключения
  if (!connected) {
    if (board === null || !Array.isArray(players)) {
      return <div>{t('loading')}</div>;
    }
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>{t('waitingForOpponent')}</h2>
        <p>{t('matchmakingFound')}</p>
      </div>
    );
  }

  // Защита от undefined (на случай задержки данных)
  if (!Array.isArray(board) || !Array.isArray(players) || board.length === 0 || players.length === 0) {
    console.log('Waiting for board data:', { board: board?.length, players: players?.length, connected, status });
    return <div style={{ textAlign: 'center', padding: '50px' }}>{t('loadingGameData')}</div>;
  }

  // Проверка доступности движка игры
  if (!engine) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>{t('gameNotSupported')}</h2>
        <p>{t('gameType')}: {currentGameType}</p>
        <p>{t('availableGamesList', { games: 'pentago, tetris' })}</p>
      </div>
    );
  }

  // Создаем gameState из данных WebSocket
  const gameState: GameState = {
    id: gameId || '',
    status: status as GameStatus,
    board: board,
    board_state: board_state,
    currentPlayer: current_player,
    players: players,
    winner: winner || undefined,
    firstMoveTimer: firstMoveTimer || undefined,
    created_at: new Date().toISOString(), // TODO: get from backend
    game_type: game_type,
  };

  console.log('GameClient state:', {
    connected,
    board: board?.length,
    players: players?.length,
    status,
    currentGameType,
    game_type_from_ws: game_type,
    engine: engine?.id,
    boardComponent: engine?.boardComponent?.name
  });

  const resetPending = isResetPending(resetVotes);

  // Обработчики для GameBoard
  const handleCellClick = (position: Position) => {
    handleCell(position.x, position.y, board, status);
  };

  const handleMoveSubmit = (move: Move) => {
    // Handle Tetris moves directly
    if (move.type === 'tetris_move') {
      sendMessage({
        type: 'move',
        ...move.data,
      });
      return;
    }

    // Handle standard moves
    sendMove();
  };

  return (
    <div className="game-client">
      <Row gutter={[16, 16]}>
        {/* Таймеры - на мобильных сверху, на десктопе слева */}
        <Col xs={24} lg={8} xl={6}>
          <GameTimers
            status={status}
            firstMoveTimer={firstMoveTimer}
            firstMovePlayer={firstMovePlayer}
            disconnectTimer={disconnectTimer}
            disconnectedPlayer={disconnectedPlayer}
            players={players}
            turn={turn}
            formatTime={formatTime}
            getPlayers={getPlayers}
            gameType={game_type}
          />
        </Col>

        {/* Игровое поле и управление - на мобильных снизу, на десктопе справа */}
        <Col xs={24} lg={16} xl={18}>
          <GameBoard
            engine={engine}
            gameState={gameState}
            onCellClick={handleCellClick}
            onMoveSubmit={handleMoveSubmit}
            selectedCell={selectedCell}
            selectedQuadrant={selectedQuadrant}
            selectedDirection={selectedDirection}
            onQuadrantSelect={handleQuadrantSelect}
            onDirectionSelect={handleDirectionSelect}
            onMoveCancel={cancelMove}
          />

          {/* Action buttons */}
          <div style={{ marginTop: 8, display: 'flex', gap: '8px' }}>
            <Button onClick={resetGame} disabled={resetPending}>
              {resetPending ? t('resetRequested') : t('requestReset')}
            </Button>
          </div>

          {/* Статус игры */}
          <div style={{ marginTop: 12, fontSize: '1.1em' }}>
            <b>{t('status')}:</b> {t(`status.${status}` as any)}
          </div>

          {status === 'finished' && (
            <div style={{ marginTop: 8, fontSize: '1.2em', fontWeight: 'bold' }}>
              <b>{t('result')}:</b>{' '}
              {winner
                ? `${t('winner')}: ${winner}`
                : t('draw')}
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <b>{t('turn')}:</b>{' '}
            {status === 'playing' ? (players[turn]?.name || t('unknownPlayer')) : t('status.notPlaying' as any)}
          </div>

          {error && (
            <div style={{ color: 'red', marginTop: 12 }}>
              <b>{t('error')}:</b> {error}
            </div>
          )}

          <MessageLog messages={messages} />
        </Col>
      </Row>
    </div>
  );
};

export default GameClient;
