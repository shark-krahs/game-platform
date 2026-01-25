/**
 * Lobby Game Selector component - manages game mode selection for lobby
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Space,
  Divider,
  Collapse,
  Row,
  Col,
  Checkbox,
} from 'antd';
import GameModeSelector from './GameModeSelector';
import CustomGameModeSelector from './CustomGameModeSelector';
import { User } from '../../types';

const { Panel } = Collapse;

interface LobbyGameSelectorProps {
  user: User | null;
  onJoinQueue: (
    gameType: string,
    timeControl: string,
    rated: boolean
  ) => void;
}

const LobbyGameSelector: React.FC<LobbyGameSelectorProps> = ({
  user,
  onJoinQueue,
}) => {
  const { t } = useTranslation('lobby');

  const [customEnabled, setCustomEnabled] = useState<Record<string, boolean>>({
    pentago: false,
    tetris: false,
  });

  const generateLabel = (initial: number, increment: number, rated: boolean) => {
    let timePart = '';

    if (initial > 0 && increment > 0) {
      timePart = `(${initial}+${increment})`;
    } else if (increment === 0 && initial > 0) {
      timePart = `(${initial} ${t('minsTotal')})`;
    } else if (initial === 0 && increment > 0) {
      timePart = `(${increment} ${t('secsPerMove')})`;
    }

    const ratedPart = rated ? ` - ${t('rated')}` : '';
    return `${timePart}${ratedPart}`;
  };

  const renderGamePanel = (gameType: string, gameName: string) => {
    const getDefaults = (gameType: string) => {
      switch (gameType) {
        case 'pentago':
          return {
            bullet: { initial: 2, increment: 1 },
            blitz: { initial: 5, increment: 3 },
            rapid: { initial: 10, increment: 5 },
            classical: { initial: 20, increment: 10 },
            custom: { initial: 5, increment: 3 }
          };
        case 'tetris':
          return {
            bullet: { initial: 0, increment: 5 },
            blitz: { initial: 0, increment: 8 },
            rapid: { initial: 0, increment: 11 },
            classical: { initial: 0, increment: 12 },
            custom: { initial: 0, increment: 7 }
          };
        default:
          return {
            bullet: { initial: 2, increment: 1 },
            blitz: { initial: 5, increment: 3 },
            rapid: { initial: 10, increment: 5 },
            classical: { initial: 20, increment: 10 },
            custom: { initial: 5, increment: 3 }
          };
      }
    };

    const defaults = getDefaults(gameType);

    return (
      <Panel
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>{gameName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            </div>
          </div>
        }
        key={gameType}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Typography.Text>{t('casualGames')}</Typography.Text>
          <GameModeSelector
            label={t('bullet')}
            iconStr="play"
            gameType={gameType}
            initial={2}
            increment={0}
            rated={false}
            onJoinQueue={onJoinQueue}
          />

          {user && (
            <>
              <Divider />
              <Typography.Text>{t('ratedGames')}</Typography.Text>
              <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  <GameModeSelector
                    label={`${t('bullet')} ${generateLabel(defaults.bullet.initial, defaults.bullet.increment, true)}`}
                    iconStr="fire"
                    gameType={gameType}
                    initial={defaults.bullet.initial}
                    increment={defaults.bullet.increment}
                    rated={true}
                    onJoinQueue={onJoinQueue}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <GameModeSelector
                    label={`${t('blitz')} ${generateLabel(defaults.blitz.initial, defaults.blitz.increment, true)}`}
                    iconStr="clock"
                    gameType={gameType}
                    initial={defaults.blitz.initial}
                    increment={defaults.blitz.increment}
                    rated={true}
                    onJoinQueue={onJoinQueue}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <GameModeSelector
                    label={`${t('rapid')} ${generateLabel(defaults.rapid.initial, defaults.rapid.increment, true)}`}
                    iconStr="trophy"
                    gameType={gameType}
                    initial={defaults.rapid.initial}
                    increment={defaults.rapid.increment}
                    rated={true}
                    onJoinQueue={onJoinQueue}
                  />
                </Col>
                <Col xs={24} sm={12}>
                  <GameModeSelector
                    label={`${t('classical')} ${generateLabel(defaults.classical.initial, defaults.classical.increment, true)}`}
                    iconStr="crown"
                    gameType={gameType}
                    initial={defaults.classical.initial}
                    increment={defaults.classical.increment}
                    rated={true}
                    onJoinQueue={onJoinQueue}
                  />
                </Col>
              </Row>

              <Divider />
              <Checkbox
                checked={customEnabled[gameType] || false}
                onChange={(e) => setCustomEnabled(prev => ({
                  ...prev,
                  [gameType]: e.target.checked
                }))}
              >
                {t('customTimeControl')}
              </Checkbox>

              {customEnabled[gameType] && (
                <CustomGameModeSelector
                  gameType={gameType}
                  showInitial={gameType === 'pentago'}
                  showIncrement={gameType === 'pentago' || gameType === 'tetris'}
                  defaultInitial={defaults.custom.initial}
                  defaultIncrement={defaults.custom.increment}
                  onJoinQueue={onJoinQueue}
                />
              )}
            </>
          )}
        </Space>
      </Panel>
    );
  };

  return (
    <Card>
      <Typography.Title level={3}>{t('quickPlay')}</Typography.Title>

      <Collapse defaultActiveKey={[]} ghost>
        {renderGamePanel('pentago', t('gamePentago'))}
        {renderGamePanel('tetris', t('gameTetris'))}
      </Collapse>

      {!user && (
        <>
          <Divider />
          <Typography.Text>{t('guestGames')}</Typography.Text>
          <Space orientation="vertical" style={{ width: '100%' }}>
            <GameModeSelector
              label={`${t('gamePentago')} ${t('bullet')}`}
              gameType="pentago"
              initial={2}
              increment={0}
              rated={false}
              onJoinQueue={onJoinQueue}
            />
            <GameModeSelector
              label={`${t('gameTetris')} ${t('bullet')}`}
              gameType="tetris"
              initial={2}
              increment={0}
              rated={false}
              onJoinQueue={onJoinQueue}
            />
          </Space>
        </>
      )}
    </Card>
  );
};

export default LobbyGameSelector;
