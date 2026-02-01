import React, {useEffect, useRef, useState} from 'react';
import {Alert, Button, Card, Form, type FormProps, Input, Space, Steps, Typography} from 'antd';
import {ClockCircleOutlined} from '@ant-design/icons';
import {Link, useSearchParams} from 'react-router-dom';
import {useAuth} from '../AuthContext';
import {useTranslation} from 'react-i18next';
import {formatSeconds} from '../utils/validation';

type ConfirmEmailChangeValues = {
    newEmail: string;
};

const ConfirmEmailChange: React.FC = () => {
    const [searchParams] = useSearchParams();
    const {confirmEmailChange, resendEmailChange, loading, error} = useAuth();
    const {t} = useTranslation('profile');
    const [message, setMessage] = useState<string>('');
    const [messageType, setMessageType] = useState<'success' | 'info'>('info');
    const [needsEmailInput, setNeedsEmailInput] = useState<boolean>(false);
    const attempted = useRef(false);
    const [cooldown, setCooldown] = useState<number>(0);
    const storageKey = 'confirmEmailChangeCooldownUntil';
    const [step, setStep] = useState<number>(0);
    const [resendMessage, setResendMessage] = useState<string>('');

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

    useEffect(() => {
        if (attempted.current) return;
        const token = searchParams.get('token');
        if (!token) {
            setMessage(t('missingToken'));
            return;
        }
        attempted.current = true;
        confirmEmailChange(token)
            .then(() => {
                setMessage(t('emailChangeConfirmed' as any));
                setMessageType('success');
                setStep(1);
            })
            .catch((err: any) => {
                const errorCode = err?.data?.detail?.code || err?.data?.code;
                if (errorCode === 'auth.new_email_required') {
                    setNeedsEmailInput(true);
                    setMessage(err?.message || t('emailChangeConfirmationFailed' as any));
                    setMessageType('info');
                    setStep(0);
                    return;
                }
                setMessage(err?.message || t('emailChangeConfirmationFailed' as any));
                setMessageType('info');
            });
    }, [confirmEmailChange, searchParams, t]);

    const onFinish: FormProps<ConfirmEmailChangeValues>['onFinish'] = async (values) => {
        const token = searchParams.get('token');
        if (!token) {
            setMessage(t('missingToken'));
            return;
        }
        try {
            await confirmEmailChange(token, values.newEmail);
            setMessage(t('emailChangeNewEmailSent' as any));
            setMessageType('info');
            setNeedsEmailInput(false);
            setCooldown(60);
            setStep(1);
        } catch (err) {
            console.error('Email change confirm failed:', err);
            const messageText = (err as any)?.message || t('emailChangeConfirmationFailed' as any);
            setMessage(messageText);
            setMessageType('info');
        }
    };

    const handleResend = async () => {
        const token = searchParams.get('token');
        if (!token) {
            setResendMessage(t('missingToken'));
            return;
        }
        try {
            await resendEmailChange(token);
            setResendMessage(t('emailChangeResent' as any));
            setCooldown(60);
        } catch (err) {
            console.error('Email change resend failed:', err);
            setResendMessage(t('emailChangeResendFailed' as any));
        }
    };

    return (
        <Card style={{maxWidth: 420, margin: '0 auto'}}>
            <Space orientation="vertical" style={{width: '100%'}}>
                <Typography.Title level={3}>{t('confirmEmailChangeTitle')}</Typography.Title>
                <Steps
                    current={step}
                    items={[
                        {title: t('confirmEmailChangeStepOld' as any)},
                        {title: t('confirmEmailChangeStepNew' as any)},
                    ]}
                    size="small"
                />
                {message && <Alert type={messageType} message={message} showIcon/>}
                {error && <Alert type="error" title={error} showIcon/>}
                {needsEmailInput && (
                    <Form<ConfirmEmailChangeValues> layout="vertical" onFinish={onFinish}>
                        <Typography.Text type="secondary">
                            {t('confirmEmailChangeHint' as any)}
                        </Typography.Text>
                        <Form.Item
                            name="newEmail"
                            rules={[
                                {required: true, message: t('emailRequired' as any)},
                                {type: 'email', message: t('emailInvalid' as any)},
                            ]}
                        >
                            <Input placeholder={t('newEmail')}/>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading} block>
                                {t('confirmEmailChangeAction' as any)}
                            </Button>
                        </Form.Item>
                    </Form>
                )}
                {step === 1 && (
                    <>
                        {cooldown > 0 && (
                            <Typography.Text type="secondary">
                                <ClockCircleOutlined/> {t('resendCooldown' as any, {time: formatSeconds(cooldown)})}
                            </Typography.Text>
                        )}
                        {resendMessage && <Alert type="info" message={resendMessage} showIcon/>}
                        <Button onClick={handleResend} disabled={cooldown > 0}>
                            {t('resendEmail' as any)}
                        </Button>
                    </>
                )}
                <Typography.Text type="secondary">
                    {t('confirmEmailChangeSpamHint' as any)}
                </Typography.Text>
                <Button type="primary" disabled={loading} block>
                    <Link to="/profile">{t('backToProfile')}</Link>
                </Button>
            </Space>
        </Card>
    );
};

export default ConfirmEmailChange;