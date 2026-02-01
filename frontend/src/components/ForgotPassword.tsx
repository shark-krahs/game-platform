import React, {useEffect, useState} from 'react';
import {Alert, Button, Card, Form, type FormProps, Input, Space, Typography} from 'antd';
import {ClockCircleOutlined} from '@ant-design/icons';
import {useAuth} from '../AuthContext';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import {formatSeconds} from '../utils/validation';

type ForgotPasswordValues = {
    username: string;
};

const ForgotPassword: React.FC = () => {
    const {requestPasswordReset, resendPasswordReset, loading, error} = useAuth();
    const {t} = useTranslation('login');
    const [infoMessage, setInfoMessage] = useState<string>('');
    const [infoType, setInfoType] = useState<'success' | 'info'>('info');
    const [maskedEmail, setMaskedEmail] = useState<string>('');
    const [form] = Form.useForm<ForgotPasswordValues>();
    const [cooldown, setCooldown] = useState<number>(0);
    const storageKey = 'forgotPasswordCooldownUntil';

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const until = Number(saved);
            const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
            if (remaining > 0) {
                setCooldown(remaining);
            } else {
                localStorage.removeItem(storageKey);
            }
        }
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => Math.max(prev - 1, 0));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    useEffect(() => {
        if (cooldown > 0) {
            localStorage.setItem(storageKey, String(Date.now() + cooldown * 1000));
        } else {
            localStorage.removeItem(storageKey);
        }
    }, [cooldown]);

    const onFinish: FormProps<ForgotPasswordValues>['onFinish'] = async (values) => {
        try {
            const response = await requestPasswordReset(values.username);
            setInfoMessage(t('resetEmailSent' as any));
            setInfoType('info');
            setMaskedEmail(response.masked_email || '');
            setCooldown(60);
        } catch (err) {
            console.error('Reset request failed:', err);
            setInfoMessage(t('resetRequestFailed' as any));
            setInfoType('info');
        }
    };

    const handleResend = async () => {
        const username = form.getFieldValue('username');
        if (!username) {
            setInfoMessage(t('missingUsername'));
            setInfoType('info');
            return;
        }
        try {
            const response = await resendPasswordReset(username);
            setInfoMessage(t('resetEmailResent' as any));
            setInfoType('info');
            setMaskedEmail(response.masked_email || '');
            setCooldown(60);
        } catch (err) {
            console.error('Reset resend failed:', err);
            setInfoMessage(t('resetResendFailed' as any));
            setInfoType('info');
        }
    };

    return (
        <Card style={{maxWidth: 420, margin: '0 auto'}}>
            <Space direction="vertical" style={{width: '100%'}}>
                <Typography.Title level={3}>{t('forgotPassword')}</Typography.Title>
                <Form<ForgotPasswordValues> layout="vertical" onFinish={onFinish} form={form}>
                    <Form.Item
                        name="username"
                        rules={[{required: true, message: t('usernameRequired')}]}
                    >
                        <Input placeholder={t('username')}/>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>
                            {t('sendReset')}
                        </Button>
                    </Form.Item>
                </Form>
                {infoMessage && (
                    <Alert
                        type={infoType}
                        message={infoMessage}
                        description={maskedEmail ? t('emailSentTo', {email: maskedEmail}) : undefined}
                        showIcon
                    />
                )}
                {infoMessage && cooldown > 0 && (
                    <Typography.Text type="secondary">
                        <ClockCircleOutlined/> {t('resendCooldown', {time: formatSeconds(cooldown)})}
                    </Typography.Text>
                )}
                {infoMessage && (
                    <Button onClick={handleResend} disabled={cooldown > 0}>
                        {t('resendEmail')}
                    </Button>
                )}
                {error && <Alert type="error" message={error} showIcon/>}
                <Link to="/login">{t('backToLogin')}</Link>
            </Space>
        </Card>
    );
};

export default ForgotPassword;