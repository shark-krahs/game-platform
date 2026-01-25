import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { ConfigProvider, theme, Layout } from 'antd';

import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './AuthContext';
import { AppThemeProvider, useTheme } from './hooks/useTheme';
import { ThemeProvider } from './components/styled/ThemeProvider';
import ErrorBoundary from './components/common/ErrorBoundary';
import GameErrorBoundary from './components/common/GameErrorBoundary';
import AppHeader from './components/layout/AppHeader';
import AppBackground from './components/layout/AppBackground';
import AuthSelector from './components/AuthSelector';
import GameClient from './components/GameClient';
import GameReplay from './components/GameReplay';
import SavedGames from './components/SavedGames';
import Profile from './components/Profile';
import Lobby from './components/Lobby';

import { User } from './types'; // Импортируем тип User

const { Content, Footer } = Layout;

function AppContent() {
  const { user } = useAuth(); // user: User | null | undefined (пока TS не знает точный тип)
  const { isDark, toggleTheme } = useTheme(); // аналогично

  const currentTheme = isDark ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme,
        token: {
          colorBgContainer: isDark ? '#1f1f1f' : '#fff',
          colorBgElevated: isDark ? '#262626' : '#fff',
          colorText: isDark ? '#e6e6e6' : '#000000d9',
          colorBorder: isDark ? '#434343' : '#d9d9d9',
        },
      }}
    >
      <AppBackground
        $backgroundColor="#888888"
        $hasOverlay={false}
        $hasBlur={false}
      />

      <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
        <AppHeader
          $isDark={isDark}
          $toggleTheme={toggleTheme}
          $hasBackgroundImage={false}
        />

        <Content
          style={{
            padding: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            flex: 1,
          }}
        >
          <div style={{ width: '100%', maxWidth: '1200px' }}>
            <Routes>
              {!user ? (
                <>
                  <Route
                    path="/game/:gameId"
                    element={
                      <GameErrorBoundary>
                        <GameClient />
                      </GameErrorBoundary>
                    }
                  />
                  <Route path="/replay/:gameId" element={<GameReplay />} />
                  <Route path="/lobby" element={<Lobby />} />
                  <Route path="/login" element={<AuthSelector />} />
                  <Route path="/register" element={<AuthSelector />} />
                  <Route path="*" element={<Navigate to="/lobby" replace />} />
                </>
              ) : (
                <>
                  <Route
                    path="/game/:gameId"
                    element={
                      <GameErrorBoundary>
                        <GameClient />
                      </GameErrorBoundary>
                    }
                  />
                  <Route path="/replay/:gameId" element={<GameReplay />} />
                  <Route path="/saved-games" element={<SavedGames />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/lobby" element={<Lobby />} />
                  <Route path="*" element={<Navigate to="/lobby" replace />} />
                </>
              )}
            </Routes>
          </div>
        </Content>

        <Footer
          style={{
            textAlign: 'center',
            background: 'transparent',
            color: isDark ? '#e6e6e6' : '#000',
          }}
        >
          Game Platform ©2025
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}

const App: React.FC = () => {
  return (
    <AppThemeProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <AppContent />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </AppThemeProvider>
  );
};

export default App;
