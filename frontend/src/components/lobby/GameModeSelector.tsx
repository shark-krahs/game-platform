/**
 * Game Mode Selector component - flexible component for game mode selection
 */

import React from 'react';
import {
  Button,
} from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  PlayCircleOutlined,
  CrownOutlined,
} from '@ant-design/icons';

interface GameModeSelectorProps {
  label: string;
  iconStr?: 'play' | 'fire' | 'clock' | 'trophy' | 'crown';
  gameType: string;
  initial: number;
  increment: number;
  rated: boolean;
  icon?: React.ReactNode;
  onJoinQueue: (
    gameType: string,
    timeControl: string,
    rated: boolean
  ) => void;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  label,
  iconStr,
  gameType,
  initial,
  increment,
  rated,
  icon,
  onJoinQueue,
}) => {
  const handleJoin = () => {
    const timeControl = `${initial}+${increment}`;
    onJoinQueue(gameType, timeControl, rated);
  };

  const getIcon = (label?: 'play' | 'fire' | 'clock' | 'trophy' | 'crown') => {
    if (icon || label === undefined) return icon;

    // Auto-select icon based on time control
    if (label === 'play') return <PlayCircleOutlined />;
    if (label === 'fire') return <FireOutlined />;
    if (label === 'clock') return <ClockCircleOutlined />;
    if (label === 'trophy') return <TrophyOutlined />;
    return <CrownOutlined />;
  };

  return (
    <Button
      block
      size="large"
      type={rated ? "primary" : "default"}
      onClick={handleJoin}
      className="game-mode-button"
    >
      {getIcon(iconStr)}
      <span className="game-mode-button__label">{label}</span>
    </Button>
  );
};

export default GameModeSelector;
