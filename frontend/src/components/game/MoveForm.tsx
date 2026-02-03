import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActionButtonsContainer,
  CancelButton,
  ConfirmButton,
  DirectionButton,
  DirectionButtonsContainer,
  FormContainer,
  FormTitle,
  QuadrantButton,
  QuadrantButtonsContainer,
} from "../styled/MoveForm.styled";
import { Position } from "../../types";

interface MoveFormProps {
  selectedCell: Position | null;
  selectedQuadrant: number | null;
  selectedDirection: "clockwise" | "counterclockwise" | null;
  handleQuadrantSelect: (quadrant: number) => void;
  handleDirectionSelect: (direction: "clockwise" | "counterclockwise") => void;
  sendMove: () => void;
  cancelMove: () => void;
  getQuadrantName: (quadrant: number) => string;
  getQuadrantColor?: (quadrant: number) => string; // Не используется в JSX, но оставляем на всякий случай
}

const MoveForm: React.FC<MoveFormProps> = ({
  selectedCell,
  selectedQuadrant,
  selectedDirection,
  handleQuadrantSelect,
  handleDirectionSelect,
  sendMove,
  cancelMove,
  getQuadrantName,
}) => {
  const { t } = useTranslation("gameClient");

  if (!selectedCell) return null;

  const isConfirmDisabled =
    selectedQuadrant === null || selectedDirection === null;

  return (
    <FormContainer>
      <FormTitle>{t("selectQuadrant")}</FormTitle>
      <QuadrantButtonsContainer>
        {[0, 1, 2, 3].map((quadrant) => (
          <QuadrantButton
            key={quadrant}
            quadrant={quadrant}
            selected={selectedQuadrant === quadrant}
            onClick={() => handleQuadrantSelect(quadrant)}
          >
            {String(t(getQuadrantName(quadrant) as any))}
          </QuadrantButton>
        ))}
      </QuadrantButtonsContainer>

      <FormTitle>{t("selectDirection")}</FormTitle>
      <DirectionButtonsContainer>
        <DirectionButton
          selected={selectedDirection === "clockwise"}
          onClick={() => handleDirectionSelect("clockwise")}
        >
          {t("clockwise")}
        </DirectionButton>
        <DirectionButton
          selected={selectedDirection === "counterclockwise"}
          onClick={() => handleDirectionSelect("counterclockwise")}
        >
          {t("counterclockwise")}
        </DirectionButton>
      </DirectionButtonsContainer>

      <ActionButtonsContainer>
        <ConfirmButton onClick={sendMove} disabled={isConfirmDisabled}>
          {t("confirmMove")}
        </ConfirmButton>
        <CancelButton onClick={cancelMove}>{t("cancel")}</CancelButton>
      </ActionButtonsContainer>
    </FormContainer>
  );
};

export default MoveForm;
