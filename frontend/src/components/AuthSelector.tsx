import React, { useState } from 'react';
import Login from './Login';
import Register from './Register';
import { useTranslation } from 'react-i18next';
import { Card, Tabs, Typography, Space, type TabsProps } from 'antd';
import { LoginOutlined, UserAddOutlined } from '@ant-design/icons';

const { Title } = Typography;

const AuthSelector: React.FC = () => {
  const { t } = useTranslation('authSelector');
  const [activeTab, setActiveTab] = useState<string>('1');

  const items: TabsProps['items'] = [
    {
      key: '1',
      label: (
        <span>
          <LoginOutlined />
          {t('login')}
        </span>
      ),
      children: <Login />,
    },
    {
      key: '2',
      label: (
        <span>
          <UserAddOutlined />
          {t('register')}
        </span>
      ),
      children: <Register />,
    },
  ];

  return (
    <Space
      orientation="vertical"
      size="large"
      style={{ width: '100%', maxWidth: 400, margin: '0 auto' }}
    >
      <Card>
        <Space orientation="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <Title level={2}>{t('title' as any)}</Title>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            centered
            size="large"
            items={items}
          />
        </Space>
      </Card>
    </Space>
  );
};

export default AuthSelector;
