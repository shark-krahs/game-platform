/**
 * Matchmaking Status component - displays current matchmaking status
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Space, Spin, Typography } from "antd";

interface MatchmakingStatusProps {
  inQueue: boolean;
  status: string;
  onLeaveQueue: () => void;
}

const MatchmakingStatus: React.FC<MatchmakingStatusProps> = ({
  inQueue,
  status,
  onLeaveQueue,
}) => {
  const { t } = useTranslation("lobby");

  if (!inQueue) return null;

  return (
    <Space
      orientation="vertical"
      align="center"
      style={{ width: "100%", margin: "40px 0" }}
    >
      <Typography.Title level={2}>{t("matchmaking")}</Typography.Title>
      <Spin size="large" />
      <Typography.Text style={{ fontSize: "18px", margin: "16px 0" }}>
        {status}
      </Typography.Text>
      <Button type="primary" danger size="large" onClick={onLeaveQueue}>
        {t("cancelMatchmaking")}
      </Button>
    </Space>
  );
};

export default MatchmakingStatus;
