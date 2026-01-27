import React, { useEffect, useState, useRef } from 'react';
import { Alert, Button, Card, Space, Typography } from 'antd';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';

const ConfirmEmailChange: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { confirmEmailChange, loading, error } = useAuth();
  const { t } = useTranslation('profile');
  const [message, setMessage] = useState<string>('');
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
    confirmEmailChange(token)
      .then((result) => setMessage(result))
      .catch(() => null);
  }, [confirmEmailChange, searchParams, t]);

  return (
    <Card style={{ maxWidth: 420, margin: '0 auto' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Title level={3}>{t('confirmEmailChangeTitle')}</Typography.Title>
        {message && <Alert type="success" message={message} showIcon />}
        {error && <Alert type="error" message={error} showIcon />}
        <Button type="primary" disabled={loading} block>
          <Link to="/profile">{t('backToProfile')}</Link>
        </Button>
      </Space>
    </Card>
  );
};

export default ConfirmEmailChange;