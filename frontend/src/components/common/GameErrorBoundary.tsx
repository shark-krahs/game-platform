/**
 * Game-specific Error Boundary - handles errors in game components
 * Provides game-specific error recovery options
 */

import React from 'react';
import { Result, Button, Typography, Space, Alert } from 'antd';
import {
  WarningOutlined,
  ReloadOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface GameErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface GameErrorBoundaryProps {
  children: React.ReactNode;
  t: (key: string, defaultValue?: string) => string;
  isDark: boolean;
}

class GameErrorBoundary extends React.Component<
  GameErrorBoundaryProps,
  GameErrorBoundaryState
> {
  constructor(props: GameErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<GameErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Game Error Boundary caught an error:', error, errorInfo);

    this.setState((prevState) => ({
      error,
      errorInfo,
      retryCount: prevState.retryCount + 1,
    }));

    if (this.state.retryCount + 1 >= 2) {
      console.warn('Multiple game errors detected, suggesting user to leave');
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleLeaveGame = () => {
    window.location.href = '/lobby';
  };

  override render() {
    const { hasError, error, retryCount } = this.state;
    const { t, isDark, children } = this.props;

    if (hasError) {
      const showPersistentWarning = retryCount >= 2;
      const disableRetry = retryCount >= 3;

      return (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
            backgroundColor: isDark ? '#141414' : '#f0f2f5',
          }}
        >
          <Result
            status="warning"
            icon={<WarningOutlined style={{ color: '#faad14', fontSize: 64 }} />}
            title={
              <Typography.Title
                level={3}
                style={{ color: isDark ? '#ffffff' : '#000000d9' }}
              >
                {t('gameErrorBoundary.title', 'Game Error')}
              </Typography.Title>
            }
            subTitle={
              <Typography.Text style={{ color: isDark ? '#cccccc' : '#666666', fontSize: 16 }}>
                {t(
                  'gameErrorBoundary.subtitle',
                  'Something went wrong with the game. You can try again or leave the game.'
                )}
              </Typography.Text>
            }
            extra={
              <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                {showPersistentWarning && (
                  <Alert
                    title={t('gameErrorBoundary.persistentError', 'This error keeps happening')}
                    description={t(
                      'gameErrorBoundary.suggestLeave',
                      'Consider leaving the game and trying again later.'
                    )}
                    type="warning"
                    showIcon
                    style={{ textAlign: 'left' }}
                  />
                )}
                <Space size="middle">
                  <Button
                    type="primary"
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={this.handleRetry}
                    disabled={disableRetry}
                  >
                    {t('gameErrorBoundary.retry', 'Retry Game')}
                  </Button>
                  <Button
                    danger
                    size="large"
                    icon={<LogoutOutlined />}
                    onClick={this.handleLeaveGame}
                  >
                    {t('gameErrorBoundary.leaveGame', 'Leave Game')}
                  </Button>
                </Space>
              </Space>
            }
          />
        </div>
      );
    }

    return children;
  }
}

// Функциональный wrapper для использования хуков
const GameErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation('gameClient');
  const { isDark } = useTheme();

  return (
    <GameErrorBoundary t={(key, defaultValue) => t(key, defaultValue || '')} isDark={isDark}>
      {children}
    </GameErrorBoundary>
  );
};

export default GameErrorBoundaryWrapper;