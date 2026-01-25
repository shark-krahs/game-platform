/**
 * Error Boundary component - catches JavaScript errors in the component tree
 * Displays a fallback UI instead of crashing the whole application
 */

import React from 'react';
import { Result, Button, Typography, Space } from 'antd';
import {
  BugOutlined,
  ReloadOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  t: (key: string, defaultValue?: string) => string;
  isDark: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Здесь можно отправлять ошибку в сервис (Sentry, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    const { hasError, error, errorInfo } = this.state;
    const { t, isDark, children } = this.props;

    if (hasError) {
      return (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? '#141414' : '#f0f2f5',
          }}
        >
          <Result
            status="error"
            icon={<BugOutlined style={{ color: '#ff4d4f', fontSize: 64 }} />}
            title={
              <Typography.Title
                level={3}
                style={{ color: isDark ? '#ffffff' : '#000000d9' }}
              >
                {t('errorBoundary.title', 'Oops! Something went wrong')}
              </Typography.Title>
            }
            subTitle={
              <Typography.Text style={{ color: isDark ? '#cccccc' : '#666666', fontSize: 16 }}>
                {t(
                  'errorBoundary.subtitle',
                  'We apologize for the inconvenience. Please try again or go back to the home page.'
                )}
              </Typography.Text>
            }
            extra={
              <Space size="middle">
                <Button
                  type="primary"
                  size="large"
                  icon={<ReloadOutlined />}
                  onClick={this.handleRetry}
                >
                  {t('errorBoundary.retry', 'Try Again')}
                </Button>
                <Button
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={this.handleGoHome}
                >
                  {t('errorBoundary.goHome', 'Go Home')}
                </Button>
              </Space>
            }
          />

          {/* Детали ошибки только в development */}
          {import.meta.env.DEV && error && (
            <details
              style={{
                marginTop: '40px',
                textAlign: 'left' as const,
                maxWidth: '800px',
                padding: '20px',
                border: `1px solid ${isDark ? '#434343' : '#d9d9d9'}`,
                borderRadius: '8px',
                backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  color: isDark ? '#ffffff' : '#000000d9',
                  marginBottom: '10px',
                }}
              >
                Error Details (Development Mode)
              </summary>
              <pre
                style={{
                  color: '#ff4d4f',
                  fontSize: '13px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: isDark ? '#000000' : '#f5f5f5',
                  padding: '10px',
                  borderRadius: '4px',
                }}
              >
                {error.toString()}
                {'\n\n'}
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

// Функциональный wrapper для использования хуков
const ErrorBoundaryWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation('app');
  const { isDark } = useTheme();

  return (
    <ErrorBoundary t={(key, defaultValue) => t(key, defaultValue || '')} isDark={isDark}>
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundaryWrapper;