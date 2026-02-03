import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  type FormProps,
  Input,
  Space,
  Typography,
} from "antd";
import { useAuth } from "../AuthContext";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

type ResetPasswordValues = {
  newPassword: string;
  confirmPassword: string;
};

const ResetPassword: React.FC = () => {
  const { resetPassword, loading, error } = useAuth();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("login");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [infoType, setInfoType] = useState<"success" | "info">("info");

  const onFinish: FormProps<ResetPasswordValues>["onFinish"] = async (
    values,
  ) => {
    const token = searchParams.get("token");
    if (!token) {
      setInfoMessage(t("missingToken"));
      setInfoType("info");
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      setInfoMessage(t("passwordsDoNotMatch"));
      setInfoType("info");
      return;
    }
    try {
      await resetPassword(token, values.newPassword);
      setInfoMessage(t("passwordResetSuccess" as any));
      setInfoType("success");
    } catch (err) {
      console.error("Reset failed:", err);
      setInfoMessage(t("resetFailed" as any));
      setInfoType("info");
    }
  };

  return (
    <Card style={{ maxWidth: 420, margin: "0 auto" }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Typography.Title level={3}>{t("resetPassword")}</Typography.Title>
        <Form<ResetPasswordValues> layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="newPassword"
            rules={[{ required: true, message: t("passwordRequired") }]}
          >
            <Input.Password placeholder={t("newPassword")} />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            rules={[{ required: true, message: t("confirmPasswordRequired") }]}
          >
            <Input.Password placeholder={t("confirmNewPassword")} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {t("resetPassword")}
            </Button>
          </Form.Item>
        </Form>
        {infoMessage && (
          <Alert type={infoType} message={infoMessage} showIcon />
        )}
        {error && <Alert type="error" message={error} showIcon />}
        <Link to="/login">{t("backToLogin")}</Link>
      </Space>
    </Card>
  );
};

export default ResetPassword;
