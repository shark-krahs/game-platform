import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, Card, Space, Typography} from 'antd';
import {Link, useSearchParams} from 'react-router-dom';
import {useAuth} from '../AuthContext';
import {useTranslation} from 'react-i18next';

const ConfirmEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const {confirmEmail, loading, error} = useAuth();
    const {t} = useTranslation('login');
    const [message, setMessage] = useState<string>('');
    const [messageType, setMessageType] = useState<'success' | 'info'>('info');
    const hasConfirmed = useRef(false);

    useEffect(() => {
        if (hasConfirmed.current) {
            return;
        }
        const token = searchParams.get('token');
        if (!token) {
            setMessage(t('missingToken'));
            return;
        }
        hasConfirmed.current = true;
        confirmEmail(token)
            .then(() => {
                setMessage(t('emailConfirmed' as any));
                setMessageType('success');
            })
            .catch(() => {
                setMessage(t('emailConfirmationFailed' as any));
                setMessageType('info');
            });
    }, [confirmEmail, searchParams, t]);

    return (
        <Card style={{maxWidth: 420, margin: '0 auto'}}>
            <Space orientation="vertical" style={{width: '100%'}}>
                <Typography.Title level={3}>{t('confirmEmailTitle')}</Typography.Title>
                {message && <Alert type={messageType} title={message} showIcon/>}
                {error && <Alert type="error" title={error} showIcon/>}
                <Button type="primary" disabled={loading} block>
                    <Link to="/login">{t('backToLogin')}</Link>
                </Button>
            </Space>
        </Card>
    );
};

export default ConfirmEmail;