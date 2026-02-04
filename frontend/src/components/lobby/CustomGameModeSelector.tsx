/**
 * Custom Game Mode Selector component - allows custom time control configuration
 */

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, InputNumber, Space, Typography } from "antd";
import { ClockCircleOutlined } from "@ant-design/icons";

interface CustomGameModeSelectorProps {
  gameType: string;
  showInitial?: boolean;
  showIncrement?: boolean;
  defaultInitial?: number;
  defaultIncrement?: number;
  initialMin?: number;
  initialMax?: number;
  incrementMin?: number;
  incrementMax?: number;
  onJoinQueue: (gameType: string, timeControl: string, rated: boolean) => void;
}

const CustomGameModeSelector: React.FC<CustomGameModeSelectorProps> = ({
  gameType,
  showInitial = true,
  showIncrement = true,
  defaultInitial = 5,
  defaultIncrement = 3,
  initialMin = 1,
  initialMax = 120,
  incrementMin = 0,
  incrementMax = 300,
  onJoinQueue,
}) => {
  const { t } = useTranslation("lobby");

  const [initial, setInitial] = useState<number>(defaultInitial);
  const [increment, setIncrement] = useState<number>(defaultIncrement);

  const handleJoin = () => {
    let timeControl: string;
    if (showInitial && showIncrement) {
      timeControl = `${initial}+${increment}`;
    } else if (showInitial) {
      timeControl = `${initial}+0`;
    } else if (showIncrement) {
      timeControl = `0+${increment}`;
    } else {
      timeControl = "0+0"; // fallback
    }
    onJoinQueue(gameType, timeControl, true);
  };

  return (
    <Space className="custom-game-mode" wrap>
      {showInitial && (
        <div>
          <Typography.Text>{t("initialMin")}</Typography.Text>
          <InputNumber
            min={initialMin}
            max={initialMax}
            value={initial}
            onChange={(value) => setInitial(value || defaultInitial)}
          />
        </div>
      )}
      {showIncrement && (
        <div>
          <Typography.Text>{t("incrementSec")}</Typography.Text>
          <InputNumber
            min={incrementMin}
            max={incrementMax}
            value={increment}
            onChange={(value) => setIncrement(value || defaultIncrement)}
          />
        </div>
      )}
      <Button
        type="primary"
        onClick={handleJoin}
        className="custom-game-mode__join"
      >
        <ClockCircleOutlined /> {t("joinCustomRated")}
      </Button>
    </Space>
  );
};

export default CustomGameModeSelector;
