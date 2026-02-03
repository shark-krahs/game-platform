import React from "react";
import { BOARD_SIZE, GAME_STATUS, QUADRANT_SIZE } from "../../constants";
import { PLAYER_COLORS } from "../../constants/colors";
import {
  Cell,
  Piece,
  PieceCircle,
  QuadrantContainer,
} from "../styled/Quadrant.styled";
import { Position } from "../../types";

interface QuadrantCellProps {
  value: number | null | undefined;
  onClick: () => void;
  isSelected: boolean;
}

const QuadrantCell: React.FC<QuadrantCellProps> = ({
  value,
  onClick,
  isSelected,
}) => {
  // Получаем цвет для игрока (value - индекс игрока 0, 1, 2...)
  const getPlayerColor = (
    playerValue: number | string | null | undefined,
  ): string => {
    if (typeof playerValue === "string") {
      return playerValue; // Если value - строка, используем её как цвет
    }
    if (
      typeof playerValue === "number" &&
      !isNaN(playerValue) &&
      playerValue >= 0 &&
      playerValue < PLAYER_COLORS.length
    ) {
      return PLAYER_COLORS[playerValue]!;
    }
    return "#cccccc"; // Fallback color
  };

  return (
    <Cell value={value} $isSelected={isSelected} onClick={onClick}>
      {value !== null && value !== undefined && (
        <Piece value={value}>
          <PieceCircle cx="50%" cy="50%" r="45%" fill={getPlayerColor(value)} />
        </Piece>
      )}
    </Cell>
  );
};

interface QuadrantProps {
  quadrant: number; // 0-3
  board: (number | null)[][];
  selectedCell: Position | null;
  handleCell: (
    x: number,
    y: number,
    board: (number | null)[][],
    status: string,
  ) => void;
  status: string;
}

const Quadrant: React.FC<QuadrantProps> = ({
  quadrant,
  board,
  selectedCell,
  handleCell,
  status,
}) => {
  // Вычисляем стартовые координаты квадранта
  const startY = quadrant >= 2 ? BOARD_SIZE / 2 : 0;
  const startX = quadrant % 2 === 1 ? BOARD_SIZE / 2 : 0;

  const quadrantCells: React.ReactNode[] = [];

  for (let dy = 0; dy < QUADRANT_SIZE; dy++) {
    for (let dx = 0; dx < QUADRANT_SIZE; dx++) {
      const x = startX + dx;
      const y = startY + dy;

      const isCellSelected =
        selectedCell !== null && selectedCell.x === x && selectedCell.y === y;

      const canClick =
        board[y]![x] === null &&
        (status === GAME_STATUS.PLAYING ||
          status === GAME_STATUS.FIRST_MOVE ||
          status === GAME_STATUS.DISCONNECT_WAIT);

      quadrantCells.push(
        <QuadrantCell
          key={`${x}-${y}`}
          value={board[y]![x]}
          isSelected={isCellSelected}
          onClick={() => canClick && handleCell(x, y, board, status)}
        />,
      );
    }
  }

  return (
    <QuadrantContainer $quadrant={quadrant}>{quadrantCells}</QuadrantContainer>
  );
};

export default Quadrant;
