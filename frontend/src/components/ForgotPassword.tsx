import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, Space, Typography, type FormProps } from 'antd';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

type ForgotPasswordValues = {
  username: string;
};

const ForgotPassword: React.FC = () => {
  const { requestPasswordReset, loading, error } = useAuth();
  const { t } = useTranslation('login');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  const onFinish: FormProps<ForgotPasswordValues>['onFinish'] = async (values) => {
    try {
      const response = await requestPasswordReset(values.username);
      setInfoMessage(response.message);
      setMaskedEmail(response.masked_email || '');
    } catch (err) {
      console.error('Reset request failed:', err);
    }
  };

  return (
    <Card style={{ maxWidth: 420, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Title level={3}>{t('forgotPassword')}</Typography.Title>
        <Form<ForgotPasswordValues> layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="username"
            rules={[{ required: true, message: t('usernameRequired') }]}
          >
            <Input placeholder={t('username')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t('sendReset')}
            </Button>
          </Form.Item>
        </Form>
        {infoMessage && (
          <Alert
            type="success"
            message={infoMessage}
            description={maskedEmail ? t('emailSentTo', { email: maskedEmail }) : undefined}
            showIcon
          />
        )}
        {error && <Alert type="error" message={error} showIcon />}
        <Link to="/login">{t('backToLogin')}</Link>
      </Space>
    </Card>
  );
};

export default ForgotPassword;