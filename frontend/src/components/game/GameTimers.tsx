import React from 'react';
import { theme } from 'antd';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import {
  TimersContainer,
  FirstMoveTimerContainer,
  FirstMoveTimerText,
  FirstMoveTimerValue,
  PlayerTimerContainer,
  PlayerName,
  PlayerTimerRow,
  PlayerColorIndicator,
  PlayerTime,
} from '../styled/GameTimers.styled';

import { GAME_STATUS } from '../../constants';
import { Player } from '../../types';

interface GameTimersProps {
  status: string;
  firstMoveTimer: number;
  firstMovePlayer: number | null;
  disconnectTimer: number;
  disconnectedPlayer: number | null;
  players: Player[];
  turn: number;
  formatTime: (seconds: number) => string;
  getPlayers: (players: Player[]) => { me: Player | null; opponent: Player | null };
  gameType?: string;
}

const GameTimers: React.FC<GameTimersProps> = ({
  status,
  firstMoveTimer,
  firstMovePlayer,
  disconnectTimer,
  disconnectedPlayer,
  players,
  turn,
  formatTime,
  getPlayers,
  gameType,
}) => {
  const { token } = theme.useToken();
  const { t } = useTranslation('gameClient');
  const { isDark } = useTheme();

  const { me, opponent } = getPlayers(players);

  const isMyFirstMove = firstMovePlayer === players.indexOf(me as Player);

  // For Tetris, only show move timer (no disconnect timer since time per move is already limited)
  const showMainTimers = gameType !== 'tetris';
  const showDisconnectTimer = gameType !== 'tetris';

  return (
    <TimersContainer>
      <h3 style={{ color: token.colorText, marginBottom: 16 }}>
        {t('timers')}
      </h3>

      {/* Таймер первого хода */}
      {status === GAME_STATUS.FIRST_MOVE && firstMoveTimer > 0 && (
        <FirstMoveTimerContainer $isPlayerTurn={isMyFirstMove}>
          <FirstMoveTimerText>{t('firstMoveTimer')}</FirstMoveTimerText>
          <PlayerTimerRow>
            <FirstMoveTimerValue $isPlayerTurn={isMyFirstMove}>
              {firstMoveTimer}s
            </FirstMoveTimerValue>
            <span style={{ color: token.colorText }}>
              {isMyFirstMove ? t('yourTurn') : t('opponentTurn')}
            </span>
          </PlayerTimerRow>
        </FirstMoveTimerContainer>
      )}

      {/* Таймер хода для Tetris */}
      {gameType === 'tetris' && status === GAME_STATUS.PLAYING && firstMoveTimer > 0 && (
        <FirstMoveTimerContainer $isPlayerTurn={isMyFirstMove}>
          <FirstMoveTimerText>Move Timer</FirstMoveTimerText>
          <PlayerTimerRow>
            <FirstMoveTimerValue $isPlayerTurn={isMyFirstMove}>
              {firstMoveTimer}s
            </FirstMoveTimerValue>
            <span style={{ color: token.colorText }}>
              {isMyFirstMove ? t('yourTurn') : t('opponentTurn')}
            </span>
          </PlayerTimerRow>
        </FirstMoveTimerContainer>
      )}

      {/* Таймер отключения (только для не-Tetris игр) */}
      {disconnectTimer > 0 && disconnectedPlayer !== null && gameType !== 'tetris' && (
        <FirstMoveTimerContainer $isPlayerTurn={false}>
          <FirstMoveTimerText style={{
            color: disconnectedPlayer === players.indexOf(me as Player) ? '#ff4d4f' : '#52c41a'
          }}>
            {disconnectedPlayer === players.indexOf(me as Player)
              ? t('youDisconnected')
              : t('opponentDisconnected')}
          </FirstMoveTimerText>
          <PlayerTimerRow>
            <FirstMoveTimerValue $isPlayerTurn={false} style={{
              color: disconnectedPlayer === players.indexOf(me as Player) ? '#ff4d4f' : '#52c41a'
            }}>
              {disconnectTimer}s
            </FirstMoveTimerValue>
            <span style={{ color: token.colorText }}>
              {disconnectedPlayer === players.indexOf(me as Player)
                ? t('automaticDefeat')
                : t('automaticVictory')}
            </span>
          </PlayerTimerRow>
        </FirstMoveTimerContainer>
      )}

      {/* Main game timers - hide for Tetris */}
      {showMainTimers && (
        <>
          {/* Таймер оппонента */}
          {opponent && (
            <PlayerTimerContainer $isActive={turn === players.indexOf(opponent)}>
              <PlayerName>{opponent.name}</PlayerName>
              <PlayerTimerRow>
                <PlayerColorIndicator color={opponent.color} />
                <PlayerTime>{formatTime(opponent.remaining || 0)}</PlayerTime>
              </PlayerTimerRow>
            </PlayerTimerContainer>
          )}

          {/* Таймер текущего игрока */}
          {me && (
            <PlayerTimerContainer $isActive={turn === players.indexOf(me)}>
              <PlayerName>{me.name}</PlayerName>
              <PlayerTimerRow>
                <PlayerColorIndicator color={me.color} />
                <PlayerTime>{formatTime(me.remaining || 0)}</PlayerTime>
              </PlayerTimerRow>
            </PlayerTimerContainer>
          )}
        </>
      )}
    </TimersContainer>
  );
};

export default GameTimers;
