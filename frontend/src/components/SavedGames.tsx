import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Typography,
  Space,
  Collapse,
  Row,
  Col,
  Button,
  message,
  Spin,
} from 'antd';
import {
  StarOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import savedGamesApi from '../services/savedGamesApi';
import { SavedGame } from '../types';
import { useNavigate } from 'react-router-dom';

const { Panel } = Collapse;

interface GameStats {
  bullet: number;
  blitz: number;
  rapid: number;
  classical: number;
  custom: number;
  total: number;
}

const SavedGames: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation('lobby');
  const navigate = useNavigate();

  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedGames();
  }, []);

  const loadSavedGames = async () => {
    try {
      setLoading(true);
      // For now, we still load all games to calculate stats
      // TODO: In future, we can optimize this by getting stats from backend
      const games = await savedGamesApi.getSavedGames();
      setSavedGames(games);
    } catch (error) {
      console.error('Failed to load saved games:', error);
      message.error('Failed to load saved games');
    } finally {
      setLoading(false);
    }
  };

  const gameStats = useMemo(() => {
    const stats: Record<string, GameStats> = {
      pentago: { bullet: 0, blitz: 0, rapid: 0, classical: 0, custom: 0, total: 0 },
      tetris: { bullet: 0, blitz: 0, rapid: 0, classical: 0, custom: 0, total: 0 },
    };

    savedGames.forEach(game => {
      const gameType = game.game_type;
      if (!stats[gameType]) return;

      stats[gameType].total++;

      // Categorize by time control
      const timeControl = game.time_control;
      if (timeControl) {
        const initial = timeControl.initial || 0;
        const increment = timeControl.increment || 0;

        if (gameType === 'pentago') {
          if (initial === 2 && increment === 0) stats[gameType].bullet++;
          else if (initial === 5 && increment === 3) stats[gameType].blitz++;
          else if (initial === 10 && increment === 5) stats[gameType].rapid++;
          else if (initial === 20 && increment === 10) stats[gameType].classical++;
          else stats[gameType].custom++;
        } else if (gameType === 'tetris') {
          if (increment === 5) stats[gameType].bullet++;
          else if (increment === 8) stats[gameType].blitz++;
          else if (increment === 11) stats[gameType].rapid++;
          else if (increment === 12) stats[gameType].classical++;
          else stats[gameType].custom++;
        }
      }
    });

    return stats;
  }, [savedGames]);

  const getGamesByTypeAndTime = (gameType: string, timeCategory: string) => {
    return savedGames.filter(game => {
      if (game.game_type !== gameType) return false;

      const timeControl = game.time_control;
      if (!timeControl) return false;

      const initial = timeControl.initial || 0;
      const increment = timeControl.increment || 0;

      if (gameType === 'pentago') {
        switch (timeCategory) {
          case 'bullet': return initial === 2 && increment === 0;
          case 'blitz': return initial === 5 && increment === 3;
          case 'rapid': return initial === 10 && increment === 5;
          case 'classical': return initial === 20 && increment === 10;
          case 'custom': return !(initial === 2 && increment === 0) &&
                               !(initial === 5 && increment === 3) &&
                               !(initial === 10 && increment === 5) &&
                               !(initial === 20 && increment === 10);
          default: return false;
        }
      } else if (gameType === 'tetris') {
        switch (timeCategory) {
          case 'bullet': return increment === 5;
          case 'blitz': return increment === 8;
          case 'rapid': return increment === 11;
          case 'classical': return increment === 12;
          case 'custom': return increment !== 5 && increment !== 8 &&
                               increment !== 11 && increment !== 12;
          default: return false;
        }
      }
      return false;
    });
  };

  const handleViewGames = async (gameType: string, timeCategory: string) => {
    try {
      // Get games by category from backend
      const games = await savedGamesApi.getSavedGamesByCategory(gameType, timeCategory);

      if (games.length === 0) {
        message.info(`No games found in ${gameType} ${timeCategory}`);
        return;
      }

      // Navigate to a detailed view or show games directly
      if (games.length === 1 && games[0]) {
        navigate(`/replay/${games[0].id}`);
      } else if (games.length > 1 && games[0]) {
        // TODO: Show a list of games for this category
        message.info(`Found ${games.length} games in ${gameType} ${timeCategory}`);
        // For now, show the most recent game
        navigate(`/replay/${games[0].id}`);
      }
    } catch (error) {
      console.error('Failed to load games by category:', error);
      message.error('Failed to load games');
    }
  };

  const renderGamePanel = (gameType: string, gameName: string) => {
    const rating = user?.ratings?.[gameType];
    const ratingText = rating ? `${rating.rating} (${rating.games_played} ${t('games')})` : t('unrated');
    const stats = gameStats[gameType] || { bullet: 0, blitz: 0, rapid: 0, classical: 0, custom: 0, total: 0 };

    return (
      <Panel
        header={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <span>{gameName}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                {stats.total} {t('games')}
              </span>
            </div>
          </div>
        }
        key={gameType}
      >
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Typography.Text>{t('yourSavedGames')}</Typography.Text>

          <Row gutter={[8, 8]}>
            {stats.bullet > 0 && (
              <Col xs={24} sm={12}>
                <Button
                  block
                  size="large"
                  type="primary"
                  icon={<HistoryOutlined />}
                  onClick={() => handleViewGames(gameType, 'bullet')}
                >
                  {t('bullet')} - {stats.bullet} {t('games')}
                </Button>
              </Col>
            )}
            {stats.blitz > 0 && (
              <Col xs={24} sm={12}>
                <Button
                  block
                  size="large"
                  type="primary"
                  icon={<HistoryOutlined />}
                  onClick={() => handleViewGames(gameType, 'blitz')}
                >
                  {t('blitz')} - {stats.blitz} {t('games')}
                </Button>
              </Col>
            )}
            {stats.rapid > 0 && (
              <Col xs={24} sm={12}>
                <Button
                  block
                  size="large"
                  type="primary"
                  icon={<HistoryOutlined />}
                  onClick={() => handleViewGames(gameType, 'rapid')}
                >
                  {t('rapid')} - {stats.rapid} {t('games')}
                </Button>
              </Col>
            )}
            {stats.classical > 0 && (
              <Col xs={24} sm={12}>
                <Button
                  block
                  size="large"
                  type="primary"
                  icon={<HistoryOutlined />}
                  onClick={() => handleViewGames(gameType, 'classical')}
                >
                  {t('classical')} - {stats.classical} {t('games')}
                </Button>
              </Col>
            )}
            {stats.custom > 0 && (
              <Col xs={24}>
                <Button
                  block
                  size="large"
                  type="default"
                  icon={<HistoryOutlined />}
                  onClick={() => handleViewGames(gameType, 'custom')}
                >
                  {t('customTimeControl')} - {stats.custom} {t('games')}
                </Button>
              </Col>
            )}
          </Row>

          {stats.total === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              {t('noSavedGames')}
            </div>
          )}
        </Space>
      </Panel>
    );
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Login Required</h2>
        <p>Please log in to view your saved games.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <p>Loading saved games...</p>
      </div>
    );
  }

  return (
    <Card>
      <Typography.Title level={3}>{t('gameHistory')}</Typography.Title>

      <Collapse defaultActiveKey={[]} ghost>
        {renderGamePanel('pentago', t('gamePentago'))}
        {renderGamePanel('tetris', t('gameTetris'))}
      </Collapse>

      {(gameStats.pentago?.total === 0 || gameStats.pentago?.total === undefined) &&
       (gameStats.tetris?.total === 0 || gameStats.tetris?.total === undefined) && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <HistoryOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div>{t('noSavedGames')}</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            {t('gamesWillBeSaved')}
          </div>
        </div>
      )}
    </Card>
  );
};

export default SavedGames;
