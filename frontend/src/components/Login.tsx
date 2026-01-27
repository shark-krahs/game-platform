import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space, type FormProps } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type LoginFormValues = {
  username: string;
  password: string;
};

const Login: React.FC = () => {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('login');

  const onFinish: FormProps<LoginFormValues>['onFinish'] = async (values) => {
    try {
      await login(values.username, values.password);
      // Если login не бросил ошибку — считаем успешным
      navigate('/lobby'); // или '/game' — как тебе удобнее после логина
    } catch (err) {
      // Ошибка уже обработана в AuthContext (error в состоянии)
      // Здесь ничего дополнительно делать не нужно
      console.error('Login failed:', err);
    }
  };


  return (
    <Form<LoginFormValues>
      name="login"
      layout="vertical"
      onFinish={onFinish}
      size="large"
      style={{ maxWidth: 300, margin: '0 auto' }}
    >
      <Form.Item<LoginFormValues>
        name="username"
        rules={[{ required: true, message: t('usernameRequired') }]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('username')}
          autoComplete="username"
        />
      </Form.Item>

      <Form.Item<LoginFormValues>
        name="password"
        rules={[{ required: true, message: t('passwordRequired') }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('password')}
          autoComplete="current-password"
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
          {t('login')}
        </Button>
      </Form.Item>

      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text>
          <Link to="/forgot-password">{t('forgotPassword')}</Link>
        </Typography.Text>
      </Space>
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

export default Login;