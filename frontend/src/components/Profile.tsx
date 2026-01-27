import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Alert,
  type FormProps,
} from 'antd';
import {
  UserOutlined,
  StarOutlined,
  LockOutlined,
  GlobalOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

type ProfileFormValues = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  preferredColor: string;
  language: string;
  newEmail?: string;
};

const Profile: React.FC = () => {
  const { user, updateProfile, requestEmailChange, error, loading } = useAuth();
  const { t, i18n } = useTranslation('profile');
  const navigate = useNavigate();
  const [form] = Form.useForm<ProfileFormValues>();
  const [emailMessage, setEmailMessage] = useState<string>('');

  // Инициализация формы при изменении пользователя
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        preferredColor: user.preferred_color || '#4287f5',
        language: user.language || 'en',
      });
    }
  }, [user, form]);

  const handleChangeLanguage = (newLang: string) => {
    i18n.changeLanguage(newLang);
  };

  const onFinish: FormProps<ProfileFormValues>['onFinish'] = async (values) => {
    const { oldPassword, newPassword, confirmPassword, preferredColor, language, newEmail } = values;

    // Локальная валидация пароля
    if (newPassword) {
      if (!oldPassword) {
        form.setFields([
          {
            name: 'oldPassword',
            errors: [t('enterOldPassword')],
          },
        ]);
        return;
      }
      if (newPassword !== confirmPassword) {
        form.setFields([
          {
            name: 'confirmPassword',
            errors: [t('passwordsDoNotMatch')],
          },
        ]);
        return;
      }
    }

    try {
      const updates: Partial<{
        old_password: string;
        new_password: string;
        preferred_color: string;
        language: string;
      }> = {
        preferred_color: preferredColor,
        language,
      };

      if (newPassword) {
        updates.old_password = oldPassword;
        updates.new_password = newPassword;
      }

      await updateProfile(updates);

      if (newEmail) {
        const response = await requestEmailChange(newEmail);
        setEmailMessage(response.masked_email ? t('emailChangeSent') : response.message);
      }

      // Очистка полей пароля после успешного обновления
      form.setFieldsValue({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
        newEmail: '',
      });

      // Можно заменить alert на более красивый notification (antd)
      alert(t('profileUpdated'));
    } catch (err: any) {
      // Ошибка уже в error из контекста, но можно усилить
      console.error('Profile update failed:', err);
    }
  };

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2}>{t('userProfile')}</Typography.Title>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space direction="vertical">
            <Typography.Text>
              <UserOutlined /> <strong>{t('username')}:</strong> {user?.username}
            </Typography.Text>
            <Typography.Text>
              <UserOutlined /> <strong>{t('email')}:</strong> {user?.email || '-'}
            </Typography.Text>
            <Typography.Text>
              <StarOutlined /> <strong>{t('stars')}:</strong> {user?.stars ?? 0}
            </Typography.Text>
          </Space>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate('/saved-games')}
            block
          >
            View Saved Games
          </Button>
        </Space>
      </Card>

      <Card title={<><LockOutlined /> {t('changePassword')}</>}>
        <Form<ProfileFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            preferredColor: user?.preferred_color || '#4287f5',
            language: user?.language || 'en',
          }}
        >
          <Form.Item name="oldPassword" label={t('oldPassword')}>
            <Input.Password placeholder={t('oldPassword')} />
          </Form.Item>

          <Form.Item name="newPassword" label={t('newPassword')}>
            <Input.Password placeholder={t('newPassword')} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={t('confirmNewPassword')}
            dependencies={['newPassword']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error(t('passwordsDoNotMatch')));
                },
              }),
            ]}
          >
            <Input.Password placeholder={t('confirmNewPassword')} />
          </Form.Item>

          <Form.Item name="preferredColor" label={t('preferredColor')}>
            <Input
              type="color"
              style={{ width: 60, height: 40, padding: 4 }}
            />
          </Form.Item>

          <Form.Item label={<><GlobalOutlined /> {t('language')}</>} name="language">
            <Select onChange={handleChangeLanguage} style={{ width: 120 }}>
              <Select.Option value="en">{t('english')}</Select.Option>
              <Select.Option value="ru">{t('russian')}</Select.Option>
              {/* Добавь другие языки при необходимости */}
            </Select>
          </Form.Item>

          <Form.Item name="newEmail" label={t('newEmail')}>
            <Input placeholder={t('newEmail')} />
          </Form.Item>

          {emailMessage && (
            <Alert type="success" message={emailMessage} showIcon style={{ marginBottom: 16 }} />
          )}

          {(form.getFieldError('oldPassword').length > 0 ||
            form.getFieldError('confirmPassword').length > 0 ||
            error) && (
            <Alert
              title={
                form.getFieldError('oldPassword')[0] ||
                form.getFieldError('confirmPassword')[0] ||
                error ||
                t('updateFailed')
              }
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              {loading ? t('saving') : t('saveChanges')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );
};

export default Profile;
