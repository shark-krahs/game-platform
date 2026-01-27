/**
 * Player Ratings component - displays user ratings for different time controls
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Typography, Row, Col, Space, Collapse } from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { User } from '../../types'; // Твой тип User

interface PlayerRatingsProps {
  user: User | null;
}

const PlayerRatings: React.FC<PlayerRatingsProps> = ({ user }) => {
  const { t } = useTranslation('lobby');

  if (!user?.ratings) return null;

  // Вспомогательная функция для получения рейтинга по ключу
  const getRating = (key: string) => {
    const ratingData = user.ratings?.[key];
    return {
      rating: ratingData?.rating?.toFixed(0) || 1500,
      games: ratingData?.games_played || 0,
    };
  };

  const pentagoBullet = getRating('pentago_bullet');
  const pentagoBlitz = getRating('pentago_blitz');
  const pentagoRapid = getRating('pentago_rapid');
  const pentagoClassical = getRating('pentago_classical');

  const tetrisBullet = getRating('tetris_bullet');
  const tetrisBlitz = getRating('tetris_blitz');
  const tetrisRapid = getRating('tetris_rapid');
  const tetrisClassical = getRating('tetris_classical');

  const items = [
    {
      key: 'pentago',
      label: t('ratingsTitle', { game: t('gamePentago') }),
      children: (
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <FireOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('bulletRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {pentagoBullet.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {pentagoBullet.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <ClockCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('blitzRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {pentagoBlitz.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {pentagoBlitz.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <TrophyOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('rapidRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {pentagoRapid.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {pentagoRapid.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <CrownOutlined style={{ color: '#722ed1', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('classicalRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {pentagoClassical.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {pentagoClassical.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'tetris',
      label: t('ratingsTitle', { game: t('gameTetris') }),
      children: (
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <FireOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('bulletRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {tetrisBullet.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {tetrisBullet.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <ClockCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('blitzRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {tetrisBlitz.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {tetrisBlitz.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <TrophyOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('rapidRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {tetrisRapid.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {tetrisRapid.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <CrownOutlined style={{ color: '#722ed1', fontSize: 24 }} />
                <div>
                  <Typography.Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {t('classicalRatings')}
                  </Typography.Text>
                  <br />
                  <Typography.Text strong style={{ fontSize: 20 }}>
                    {tetrisClassical.rating}
                  </Typography.Text>
                  <br />
                  <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                    {tetrisClassical.games} {t('games')}
                  </Typography.Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <Collapse items={items} defaultActiveKey={[]} />
  );
};

export default PlayerRatings;
