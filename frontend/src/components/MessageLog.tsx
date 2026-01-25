import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { createTheme } from '../theme';

interface MessageLogProps {
  messages: string[];
}

const MessageLog: React.FC<MessageLogProps> = ({ messages }) => {
  const { t } = useTranslation('gameClient');
  const { isDark } = useTheme();
  const theme = createTheme(isDark);

  return (
    <div style={{ marginTop: 20 }}>
      <b>{t('messages')}</b>
      <div
        style={{
          whiteSpace: 'pre-wrap',
          background: theme.colors.backgroundElevated,
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.text,
          padding: 10,
          borderRadius: 6,
          maxHeight: 200,
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.9em',
        }}
      >
        {messages.join('\n') || t('noMessage')}
      </div>
    </div>
  );
};

export default MessageLog;
