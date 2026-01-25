/**
 * Styled components for Quadrant
 */

import styled, { keyframes } from 'styled-components';

// Анимация появления фишки
const piecePlaceAnimation = keyframes`
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

// Пропсы для компонентов
interface QuadrantContainerProps {
  $quadrant: number; // 0-3
}

interface CellProps {
  value?: number | null;
  $isSelected?: boolean;
}

interface PieceProps {
  value?: number | null;
}

interface PieceCircleProps {
  cx: string;
  cy: string;
  r: string;
  fill: string;
}

// Типизируем styled-компоненты с темой и пропсами
export const QuadrantContainer = styled.div<QuadrantContainerProps>`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  padding: 4px;
  background-color: ${(props) => {
    const colors = ['#dd1414', '#1414dd', '#14dd14', '#dddd14'];
    return colors[props.$quadrant] || '#888888';
  }};
  border-radius: 12px;
  border: 3px solid #000000;
  width: var(--pentago-quadrant-size);
  height: var(--pentago-quadrant-size);
`;

export const Cell = styled.div<CellProps>`
  width: var(--pentago-cell-size);
  height: var(--pentago-cell-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #000000;
  cursor: ${(props) => (props.value !== null && props.value !== undefined ? 'default' : 'pointer')};
  background-color: ${(props) =>
    props.$isSelected ? '#ffe6e6' : 'transparent'};
  border-radius: 4px;

  &:hover {
    background-color: ${(props) =>
      props.value !== null && props.value !== undefined ? 'transparent' : '#f0f0f0'};
  }
`;

export const Piece = styled.svg<PieceProps>`
  width: calc(var(--pentago-cell-size) - 4px);
  height: calc(var(--pentago-cell-size) - 4px);
  animation: ${(props) =>
      props.value !== null && props.value !== undefined ? piecePlaceAnimation : 'none'}
    0.5s ease-out;
`;

export const PieceCircle = styled.circle<PieceCircleProps>`
  cx: ${(props) => props.cx};
  cy: ${(props) => props.cy};
  r: ${(props) => props.r};
  fill: ${(props) => props.fill};
`;
