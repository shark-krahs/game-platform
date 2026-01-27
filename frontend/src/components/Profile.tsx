import React, { useEffect, useState } from 'react';
import {
  App,
  Card,
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Alert,
  Steps,
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
import { formatSeconds } from '../utils/validation';

type ProfileFormValues = {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  preferredColor: string;
  language: string;
};

const Profile: React.FC = () => {
  const { notification } = App.useApp();
  const { user, updateProfile, requestEmailChange, error, loading } = useAuth();
  const { t, i18n } = useTranslation('profile');
  const navigate = useNavigate();
  const [form] = Form.useForm<ProfileFormValues>();
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [emailMessageType, setEmailMessageType] = useState<'success' | 'info'>('info');
  const [emailCooldown, setEmailCooldown] = useState<number>(0);
  const storageKey = 'profileEmailChangeCooldownUntil';
  const [emailChangeRequested, setEmailChangeRequested] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const until = Number(saved);
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      if (remaining > 0) {
        setEmailCooldown(remaining);
        setEmailChangeRequested(true);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  }, []);

  useEffect(() => {
    if (emailCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailCooldown]);

  useEffect(() => {
    if (emailCooldown > 0) {
      localStorage.setItem(storageKey, String(Date.now() + emailCooldown * 1000));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [emailCooldown]);

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
    const { oldPassword, newPassword, confirmPassword, preferredColor, language } = values;

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

      // Очистка полей пароля после успешного обновления
      form.setFieldsValue({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      notification.success({
        message: t('profileUpdated'),
      });
    } catch (err: any) {
      notification.error({
        message: t('updateFailed'),
      });
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
              <UserOutlined /> <strong>{t('email')}:</strong> {user?.email || t('missingEmail' as any)}
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
            {t('viewSavedGames' as any)}
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
            <Select onChange={handleChangeLanguage} style={{ width: 160 }}>
              <Select.Option value="en">{t('english')}</Select.Option>
              <Select.Option value="ru">{t('russian')}</Select.Option>
              <Select.Option value="be">{t('belarusian')}</Select.Option>
              <Select.Option value="kk">{t('kazakh')}</Select.Option>
              <Select.Option value="uk">{t('ukrainian')}</Select.Option>
            </Select>
          </Form.Item>


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

      <Card title={t('emailChange')}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Steps
            size="small"
            current={emailChangeRequested ? 1 : 0}
            items={[
              { title: t('emailChangeStepRequest' as any) },
              { title: t('emailChangeStepConfirm' as any) },
            ]}
          />
          <Typography.Text type="secondary">
            {t('emailChangeDescription' as any)}
          </Typography.Text>
          {emailMessage && (
            <Alert type={emailMessageType} message={emailMessage} showIcon style={{ marginBottom: 16 }} />
          )}
          {emailChangeRequested && emailCooldown > 0 && (
            <Typography.Text type="secondary">
              {t('resendCooldown' as any, { time: formatSeconds(emailCooldown) })}
            </Typography.Text>
          )}
          {emailChangeRequested && (
            <Button
              onClick={async () => {
                try {
                  const response = await requestEmailChange();
                  setEmailMessage(response.masked_email ? t('emailChangeSent') : t('emailChangeResent' as any));
                  setEmailMessageType('info');
                  setEmailCooldown(60);
                } catch (err) {
                  console.error('Email change resend failed:', err);
                  setEmailMessage(t('emailChangeResendFailed' as any));
                  setEmailMessageType('info');
                }
              }}
              disabled={emailCooldown > 0}
            >
              {t('resendEmail' as any)}
            </Button>
          )}
          <Button
            type="default"
            onClick={async () => {
              const confirmed = window.confirm(t('confirmEmailChangePrompt' as any));
              if (!confirmed) return;
              try {
                const response = await requestEmailChange();
                setEmailMessage(response.masked_email ? t('emailChangeSent') : t('emailChangeSent'));
                setEmailMessageType('info');
                setEmailCooldown(60);
                setEmailChangeRequested(true);
              } catch (err) {
                console.error('Email change request failed:', err);
                setEmailMessage(t('emailChangeRequestFailed' as any));
                setEmailMessageType('info');
              }
            }}
            disabled={loading || emailCooldown > 0}
            block
          >
            {t('requestEmailChange' as any)}
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default Profile;
