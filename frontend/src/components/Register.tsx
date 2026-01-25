import React from 'react';
import { Form, Input, Button, Alert, type FormProps } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type RegisterFormValues = {
  username: string;
  password: string;
  confirmPassword: string;
};

const Register: React.FC = () => {
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('register');

  const onFinish: FormProps<RegisterFormValues>['onFinish'] = async (values) => {
    try {
      await register(values.username, values.password);
      // Если register не бросил ошибку — регистрация успешна
      navigate('/lobby'); // или '/game' — как у тебя принято после регистрации
    } catch (err) {
      // Ошибка уже отображена через error из контекста
      console.error('Registration failed:', err);
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