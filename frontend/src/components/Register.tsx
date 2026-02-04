import React, { useState } from "react";
import { Alert, Button, Form, type FormProps, Input } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "../AuthContext";
import { useTranslation } from "react-i18next";
import RecoveryCodesModal from "./RecoveryCodesModal";

type RegisterFormValues = {
  username: string;
  password: string;
  confirmPassword: string;
};

const Register: React.FC = () => {
  const { register, confirmRecoverySetup, loading, error } = useAuth();
  const { t, i18n } = useTranslation("register");
  const [localMessage, setLocalMessage] = useState<string>("");
  const [localMessageType, setLocalMessageType] = useState<"success" | "info">(
    "info",
  );
  const [codes, setCodes] = useState<string[]>([]);
  const [setupToken, setSetupToken] = useState<string>("");
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);

  const showCodes = codes.length > 0;

  const onFinish: FormProps<RegisterFormValues>["onFinish"] = async (
    values,
  ) => {
    try {
      const response = await register(
        values.username,
        values.password,
        i18n.resolvedLanguage || i18n.language || "en",
      );
      setLocalMessage(t("registerSuccess" as any));
      setLocalMessageType("success");
      setCodes(response.recovery_codes || []);
      setSetupToken(response.recovery_setup_token || "");
      setShowRecoveryModal(true);
    } catch (err) {
      // Ошибка уже отображена через error из контекста
      console.error("Registration failed:", err);
    }
  };

  const handleConfirmSaved = async () => {
    if (!setupToken) return;
    try {
      await confirmRecoverySetup(setupToken);
      setShowRecoveryModal(false);
    } catch (err) {
      console.error("Confirm setup failed:", err);
    }
  };

  return (
    <Form<RegisterFormValues>
      name="register"
      layout="vertical"
      onFinish={onFinish}
      size="large"
      style={{ maxWidth: 300, margin: "0 auto" }}
    >
      <Form.Item<RegisterFormValues>
        name="username"
        rules={[
          { required: true, message: t("usernameRequired") },
          { min: 3, message: t("usernameMinLength") },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t("username")}
          autoComplete="username"
        />
      </Form.Item>

      <Form.Item<RegisterFormValues>
        name="password"
        rules={[
          { required: true, message: t("passwordRequired") },
          { min: 6, message: t("passwordMinLength") },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t("password")}
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item<RegisterFormValues>
        name="confirmPassword"
        dependencies={["password"]}
        rules={[
          { required: true, message: t("confirmPasswordRequired") },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(t("passwordsDoNotMatch")));
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t("confirmPassword")}
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
          {t("register")}
        </Button>
      </Form.Item>

      {localMessage && (
        <Alert
          type={localMessageType}
          title={localMessage}
          showIcon
          style={{ marginTop: 16 }}
        />
      )}

      {showCodes && (
        <RecoveryCodesModal
          open={showRecoveryModal}
          codes={codes}
          onAcknowledge={handleConfirmSaved}
        />
      )}

      {error && (
        <Alert title={error} type="error" showIcon style={{ marginTop: 16 }} />
      )}
    </Form>
  );
};

export default Register;
