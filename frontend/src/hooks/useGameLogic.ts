import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Player } from '../types';

interface CellPosition {
  x: number;
  y: number;
}

interface GameSelection {
  selectedCell: CellPosition | null;
  selectedQuadrant: number | null;
  selectedDirection: string | null;
}

interface UseGameLogicReturn extends GameSelection {
  handleCell: (
    x: number,
    y: number,
    board: (number | null)[][],
    status: string
  ) => void;
  handleQuadrantSelect: (quadrant: number) => void;
  handleDirectionSelect: (direction: string) => void;
  sendMove: () => void;
  cancelMove: () => void;
  resetGame: () => void;

  getQuadrantName: (quadrant: number) => string;
  getQuadrantColor: (quadrant: number) => string;
  formatTime: (seconds: number) => string;
  getPlayers: (players: Player[]) => { me: Player | null; opponent: Player | null };
  isResetPending: (resetVotes: (number | string)[]) => boolean;
}

export function useGameLogic(
  sendMessage: (message: any) => void,
  user: User | null
): UseGameLogicReturn {
  const { t } = useTranslation('gameClient');

  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<number | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);

  const handleCell = useCallback(
    (x: number, y: number, board: (number | null)[][], status: string) => {
      if (
        !board[y]![x] &&
        (status === 'playing' || status === 'first_move' || status === 'disconnect_wait')
      ) {
        setSelectedCell({ x, y });
      }
    },
    []
  );

  const handleQuadrantSelect = useCallback((quadrant: number) => {
    setSelectedQuadrant(quadrant);
  }, []);

  const handleDirectionSelect = useCallback((direction: string) => {
    setSelectedDirection(direction);
  }, []);

  const sendMove = useCallback(() => {
    if (
      selectedCell === null ||
      selectedQuadrant === null ||
      selectedDirection === null
    ) {
      return;
    }

    sendMessage({
      type: 'move',
      x: selectedCell.x,
      y: selectedCell.y,
      quadrant: selectedQuadrant,
      direction: selectedDirection,
    });

    // Сброс выбора после отправки
    setSelectedCell(null);
    setSelectedQuadrant(null);
    setSelectedDirection(null);
  }, [selectedCell, selectedQuadrant, selectedDirection, sendMessage]);

  const cancelMove = useCallback(() => {
    setSelectedCell(null);
    setSelectedQuadrant(null);
    setSelectedDirection(null);
  }, []);

  const resetGame = useCallback(() => {
    sendMessage({ type: 'reset' });
  }, [sendMessage]);

  const getQuadrantName = useCallback(
    (quadrant: number): string => {
      const names = ['Red', 'Blue', 'Green', 'Yellow'];
      return `${names[quadrant] || 'Unknown'} ${t('quadrant')}`;
    },
    [t]
  );

  const getQuadrantColor = useCallback((quadrant: number): string => {
    const colors = ['#dd1414', '#1414dd', '#14dd14', '#dddd14'];
    return colors[quadrant] || '#888888';
  }, []);

  const formatTime = useCallback((seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, []);

  const getPlayers = useCallback(
    (players: Player[]): { me: Player | null; opponent: Player | null } => {
      if (!Array.isArray(players)) {
        return { me: null, opponent: null };
      }

      const me = players.find((p) => p?.name === user?.username) || null;
      const opponent = players.find((p) => p?.name !== user?.username) || null;

      return { me, opponent };
    },
    [user?.username]
  );

  const isResetPending = useCallback(
    (resetVotes: (number | string)[]): boolean => {
      if (!user?.id) return false;
      const myUserId = user.id.toString();
      return resetVotes.includes(myUserId);
    },
    [user?.id]
  );

  return {
    selectedCell,
    selectedQuadrant,
    selectedDirection,

    handleCell,
    handleQuadrantSelect,
    handleDirectionSelect,
    sendMove,
    cancelMove,
    resetGame,

    getQuadrantName,
    getQuadrantColor,
    formatTime,
    getPlayers,
    isResetPending,
  };
}
