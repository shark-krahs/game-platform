import React, {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useTheme} from '../hooks/useTheme';
import {createTheme} from '../theme';
import {ChatMessage} from '../types';

interface MessageLogProps {
    messages: string[];
    chatMessages?: ChatMessage[];
    onSendChat?: (message: string) => void;
    disabled?: boolean;
    showSystemMessages?: boolean;
}

const MessageLog: React.FC<MessageLogProps> = ({
                                                   messages,
                                                   chatMessages = [],
                                                   onSendChat,
                                                   disabled = false,
                                                   showSystemMessages = true,
                                               }) => {
    const {t} = useTranslation('gameClient');
    const {isDark} = useTheme();
    const theme = createTheme(isDark);
    const [draft, setDraft] = useState('');

    const formattedChat = useMemo(() => {
        if (!chatMessages.length) {
            return t('noChatMessages');
        }

        return chatMessages
            .map((item) => {
                const time = new Date(item.timestamp).toLocaleTimeString();
                return `[${time}] ${item.username}: ${item.message}`;
            })
            .join('\n');
    }, [chatMessages, t]);

    const sendChat = () => {
        const trimmed = draft.trim();
        if (!trimmed || !onSendChat) {
            return;
        }
        onSendChat(trimmed);
        setDraft('');
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendChat();
        }
    };

    return (
        <div style={{marginTop: 20}}>
            <div style={{marginBottom: 12}}>
                <b>{t('chat')}</b>
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
                    {formattedChat}
                </div>
                {onSendChat && (
                    <div style={{marginTop: 8, display: 'flex', gap: 8}}>
                        <input
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder={t('chatPlaceholder')}
                            disabled={disabled}
                            style={{
                                flex: 1,
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: `1px solid ${theme.colors.border}`,
                                background: theme.colors.background,
                                color: theme.colors.text,
                            }}
                        />
                        <button
                            onClick={sendChat}
                            disabled={disabled || !draft.trim()}
                            style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: `1px solid ${theme.colors.border}`,
                                background: theme.colors.backgroundElevated,
                                color: theme.colors.text,
                                cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {t('send')}
                        </button>
                    </div>
                )}
            </div>

            {showSystemMessages && messages.length > 0 && (
                <div>
                    <b>{t('messages')}</b>
                    <div
                        style={{
                            whiteSpace: 'pre-wrap',
                            background: theme.colors.backgroundElevated,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text,
                            padding: 10,
                            borderRadius: 6,
                            maxHeight: 140,
                            overflowY: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.9em',
                        }}
                    >
                        {messages.join('\n')}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MessageLog;
