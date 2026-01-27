import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space, type FormProps } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatSeconds } from '../utils/validation';

type RegisterFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const Register: React.FC = () => {
  const { register, resendConfirmation, loading, error } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('register');
  const [cooldown, setCooldown] = useState<number>(0);
  const [localMessage, setLocalMessage] = useState<string>('');
  const [localMessageType, setLocalMessageType] = useState<'success' | 'info'>('info');
  const [resendAvailable, setResendAvailable] = useState<boolean>(false);
  const storageKey = 'registerResendCooldownUntil';

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

  const onFinish: FormProps<RegisterFormValues>['onFinish'] = async (values) => {
    try {
      await register(values.username, values.password, values.email, i18n.resolvedLanguage || i18n.language || 'en');
      localStorage.setItem('lastRegisteredUsername', values.username);
      setLocalMessage(t('checkEmail' as any));
      setLocalMessageType('info');
      setResendAvailable(true);
      setCooldown(60);
    } catch (err) {
      // Ошибка уже отображена через error из контекста
      console.error('Registration failed:', err);
    }
  };

  const handleResend = async () => {
    const username = localStorage.getItem('lastRegisteredUsername');
    if (!username) {
      setLocalMessage(t('missingUsername' as any));
      setLocalMessageType('info');
      return;
    }
    try {
      const response = await resendConfirmation(username);
      setLocalMessage(t('resendSuccess' as any));
      setLocalMessageType('info');
      setCooldown(response.seconds_remaining ?? 60);
    } catch (err: any) {
      if (err?.status === 429 || err?.message?.includes('429')) {
        const remaining = err?.data?.detail?.seconds_remaining;
        setLocalMessage(t('resendCooldownServer' as any));
        setLocalMessageType('info');
        setCooldown(remaining ?? 60);
        return;
      }
      setLocalMessage(err?.message || t('resendFailed' as any));
      setLocalMessageType('info');
    }
  };

  return (
    <Form<RegisterFormValues>
      name="register"
      layout="vertical"
      onFinish={onFinish}
      size="large"
      style={{ maxWidth: 300, margin: '0 auto' }}
    >
      <Form.Item<RegisterFormValues>
        name="username"
        rules={[
          { required: true, message: t('usernameRequired') },
          { min: 3, message: t('usernameMinLength') },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('username')}
          autoComplete="username"
        />
      </Form.Item>

      <Form.Item<RegisterFormValues>
        name="email"
        rules={[
          { required: true, message: t('emailRequired') },
          { type: 'email', message: t('emailInvalid') },
        ]}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder={t('email')}
          autoComplete="email"
        />
      </Form.Item>

      <Form.Item<RegisterFormValues>
        name="password"
        rules={[
          { required: true, message: t('passwordRequired') },
          { min: 6, message: t('passwordMinLength') },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('password')}
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item<RegisterFormValues>
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { required: true, message: t('confirmPasswordRequired') },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(t('passwordsDoNotMatch')));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('confirmPassword')}
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          size="large"
        >
          {t('register')}
        </Button>
      </Form.Item>

      {resendAvailable && (
        <Space direction="vertical" style={{ width: '100%' }}>
          {cooldown > 0 && (
            <Typography.Text type="secondary">
              <ClockCircleOutlined /> {t('resendTimerLabel' as any)} {formatSeconds(cooldown)}
            </Typography.Text>
          )}
          <Button onClick={handleResend} disabled={cooldown > 0}>
            {cooldown > 0
              ? t('resendCooldown' as any, { time: formatSeconds(cooldown) })
              : t('resendEmail' as any)}
          </Button>
        </Space>
      )}

      {localMessage && (
        <Alert type={localMessageType} message={localMessage} showIcon style={{ marginTop: 16 }} />
      )}

      {error && (
        <Alert
          title={error}
          type="error"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </Form>
  );
};

export default Register;