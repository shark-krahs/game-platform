import React, { useEffect, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  type FormProps,
  Input,
  Select,
  Space,
  Typography,
} from "antd";
import {
  GlobalOutlined,
  LockOutlined,
  PlayCircleOutlined,
  StarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../AuthContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import RecoveryCodesModal from "./RecoveryCodesModal";

type ProfileFormValues = {
  preferredColor: string;
  language: string;
};

type RecoveryPasswordValues = {
  recoveryCode: string;
  newPassword: string;
  confirmPassword: string;
};

type RegenerateValues = {
  password: string;
};

const Profile: React.FC = () => {
  const { notification } = App.useApp();
  const { user, updateProfile, error, loading } = useAuth();
  const { t, i18n } = useTranslation("profile");
  const navigate = useNavigate();
  const [form] = Form.useForm<ProfileFormValues>();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState<boolean>(true);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState<boolean>(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    authService
      .getRecoveryStatus()
      .then((status) => {
        if (!mounted) return;
        const confirmed = Boolean(status.confirmed);
        setRecoveryConfirmed(confirmed);
        setShowRecoveryBanner(!confirmed);
      })
      .catch(() => {
        if (!mounted) return;
        setRecoveryConfirmed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Инициализация формы при изменении пользователя
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        preferredColor: user.preferred_color || "#4287f5",
        language: user.language || "en",
      });
    }
  }, [user, form]);

  const handleChangeLanguage = (newLang: string) => {
    i18n.changeLanguage(newLang);
  };

  const onFinish: FormProps<ProfileFormValues>["onFinish"] = async (values) => {
    const { preferredColor, language } = values;

    try {
      const updates: Partial<{
        preferred_color: string;
        language: string;
      }> = {
        preferred_color: preferredColor,
        language,
      };

      await updateProfile(updates);

      notification.success({
        message: t("profileUpdated"),
      });
    } catch (err: any) {
      notification.error({
        message: t("updateFailed"),
      });
      console.error("Profile update failed:", err);
    }
  };

  return (
    <Space orientation="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={2}>{t("userProfile")}</Typography.Title>

      <Card>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space direction="vertical">
            <Typography.Text>
              <UserOutlined /> <strong>{t("username")}:</strong>{" "}
              {user?.username}
            </Typography.Text>
            <Typography.Text>
              <StarOutlined /> <strong>{t("stars")}:</strong> {user?.stars ?? 0}
            </Typography.Text>
          </Space>

          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => navigate("/saved-games")}
            block
          >
            {t("viewSavedGames" as any)}
          </Button>
        </Space>
      </Card>

      {!recoveryConfirmed && showRecoveryBanner && (
        <Alert
          type="warning"
          message={t("recoveryBannerTitle" as any)}
          description={
            <div>
              <p>{t("recoveryBannerText" as any)}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button
                  type="primary"
                  onClick={async () => {
                    await authService.confirmRecoveryViewed();
                    setRecoveryConfirmed(true);
                    setShowRecoveryBanner(false);
                  }}
                >
                  {t("riskAcknowledged" as any)}
                </Button>
                <Button onClick={() => setShowRecoveryBanner(false)}>
                  {t("dismissBanner" as any)}
                </Button>
              </div>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <>
            <LockOutlined /> {t("changePassword")}
          </>
        }
      >
        <Form<RecoveryPasswordValues>
          layout="vertical"
          onFinish={async (values) => {
            if (values.newPassword !== values.confirmPassword) {
              setRecoveryMessage(t("passwordsDoNotMatch" as any));
              return;
            }
            try {
              const verify = await authService.verifyRecoveryCode(
                user?.username || "",
                values.recoveryCode,
              );
              if (!verify.reset_token) {
                setRecoveryMessage(t("recoveryInvalid" as any));
                return;
              }
              await authService.resetPasswordWithRecovery(
                verify.reset_token,
                values.newPassword,
              );
              notification.success({ message: t("passwordChanged" as any) });
            } catch (err) {
              console.error("Recovery reset failed:", err);
              setRecoveryMessage(t("recoveryInvalid" as any));
            }
          }}
        >
          <Form.Item
            name="recoveryCode"
            label={t("recoveryCode" as any)}
            rules={[{ required: true, message: t("recoveryCodeRequired" as any) }]}
          >
            <Input
              placeholder={t("recoveryCode" as any)}
              disabled={!recoveryConfirmed}
            />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label={t("newPassword")}
            rules={[{ required: true, message: t("passwordRequired" as any) }]}
          >
            <Input.Password
              placeholder={t("newPassword")}
              disabled={!recoveryConfirmed}
            />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t("confirmNewPassword")}
            rules={[{ required: true, message: t("confirmNewPassword") }]}
          >
            <Input.Password
              placeholder={t("confirmNewPassword")}
              disabled={!recoveryConfirmed}
            />
          </Form.Item>
          {recoveryMessage && (
            <Alert
              title={recoveryMessage}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              disabled={!recoveryConfirmed}
            >
              {t("changePassword")}
            </Button>
          </Form.Item>
        </Form>
        {!recoveryConfirmed && (
          <Alert
            title={t("recoveryActionBlocked" as any)}
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      <Card title={t("recoveryTitle" as any)}>
        <Form<RegenerateValues>
          layout="vertical"
          onFinish={async (values) => {
            try {
              await authService.regenerateRecoveryCodes(values.password);
              const response = await authService.fetchRecoveryCodes();
              setRecoveryCodes(response.codes || []);
              setShowRecoveryModal(true);
            } catch (err) {
              console.error("Recovery regenerate failed:", err);
              notification.error({ message: t("recoveryRegenerateFailed" as any) });
            }
          }}
        >
          <Form.Item
            name="password"
            label={t("currentPassword" as any)}
            rules={[{ required: true, message: t("passwordRequired" as any) }]}
          >
            <Input.Password
              placeholder={t("currentPassword" as any)}
              disabled={!recoveryConfirmed}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="default"
              htmlType="submit"
              block
              disabled={!recoveryConfirmed}
            >
              {t("recoveryRegenerate" as any)}
            </Button>
          </Form.Item>
        </Form>

        {recoveryCodes.length > 0 && (
          <RecoveryCodesModal
            open={showRecoveryModal}
            codes={recoveryCodes}
            onAcknowledge={async () => {
              await authService.confirmRecoveryViewed();
              setRecoveryCodes([]);
              setShowRecoveryModal(false);
              notification.success({ message: t("codesConfirmed" as any) });
            }}
          />
        )}
      </Card>

      <Card
        title={
          <>
            <GlobalOutlined /> {t("settings" as any)}
          </>
        }
      >
        <Form<ProfileFormValues>
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            preferredColor: user?.preferred_color || "#4287f5",
            language: user?.language || "en",
          }}
        >
          <Form.Item name="preferredColor" label={t("preferredColor")}>
            <Input
              type="color"
              style={{ width: 60, height: 40, padding: 4 }}
              disabled={!recoveryConfirmed}
            />
          </Form.Item>

          <Form.Item
            label={
              <>
                <GlobalOutlined style={{ marginRight: 8 }} />
                {t("language")}
              </>
            }
            name="language"
          >
            <Select
              onChange={handleChangeLanguage}
              style={{ width: 160 }}
              disabled={!recoveryConfirmed}
            >
              <Select.Option value="en">{t("english")}</Select.Option>
              <Select.Option value="ru">{t("russian")}</Select.Option>
              <Select.Option value="be">{t("belarusian")}</Select.Option>
              <Select.Option value="kk">{t("kazakh")}</Select.Option>
              <Select.Option value="uk">{t("ukrainian")}</Select.Option>
            </Select>
          </Form.Item>

          {error && (
            <Alert
              title={error || t("updateFailed")}
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
              disabled={!recoveryConfirmed}
            >
              {loading ? t("saving") : t("saveChanges")}
            </Button>
          </Form.Item>
        </Form>
        {!recoveryConfirmed && (
          <Alert
            title={t("recoveryActionBlocked" as any)}
            type="info"
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </Card>
    </Space>
  );
};

export default Profile;
