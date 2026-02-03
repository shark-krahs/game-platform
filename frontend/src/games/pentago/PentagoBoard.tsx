import React from "react";
import Quadrant from "../../components/game/Quadrant";
import { GameBoardProps } from "../../types";

const PentagoBoard: React.FC<GameBoardProps> = ({
  gameState,
  onCellClick,
  onMoveSubmit,
  selectedCell,
  selectedQuadrant,
  selectedDirection,
  onQuadrantSelect,
  onDirectionSelect,
  onMoveCancel,
}) => {
  // onMoveSubmit is not used in board component anymore
  const handleCell = (x: number, y: number) => {
    onCellClick({ x, y });
  };

  return (
    <div className="pentago-board-frame">
      {/* Игровое поле — 2x2 квадранта */}
      <div
        className="pentago-board-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, var(--pentago-quadrant-size))",
          justifyContent: "center",
        }}
      >
        {[0, 1, 2, 3].map((quadrant) => (
          <Quadrant
            key={quadrant}
            quadrant={quadrant}
            board={gameState.board}
            selectedCell={selectedCell || null}
            handleCell={handleCell}
            status={gameState.status}
          />
        ))}
      </div>
    </div>
  );
};

export default PentagoBoard;
