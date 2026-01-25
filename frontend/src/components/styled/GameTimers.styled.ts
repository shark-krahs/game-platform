/**
 * Styled components for GameTimers
 */

import styled from 'styled-components';
import { Theme } from '../../types';

// Пропсы для компонентов
interface FirstMoveTimerContainerProps {
  $isPlayerTurn: boolean;
}

interface PlayerTimerContainerProps {
  $isActive: boolean;
}

interface PlayerColorIndicatorProps {
  color?: string;
}

// Типизируем styled-компоненты с темой
export const TimersContainer = styled.div`
  width: min(100%, ${(props) => props.theme.layout.timer.panelWidth}px);
`;

export const FirstMoveTimerContainer = styled.div<FirstMoveTimerContainerProps>`
  padding: ${(props) => props.theme.layout.timer.height / 6}px;
  margin-bottom: ${(props) => props.theme.layout.timer.height / 6}px;
  border: ${(props) => props.theme.layout.timer.borderWidth * 2}px solid
    ${(props) =>
      props.$isPlayerTurn
        ? props.theme.colors.status.error
        : props.theme.colors.status.success};
  border-radius: ${(props) => props.theme.layout.timer.borderRadius};
  background-color: ${(props) => props.theme.colors.backgroundElevated};
`;

export const FirstMoveTimerText = styled.div`
  color: ${(props) => props.theme.colors.text};
  font-weight: bold;
`;

export const FirstMoveTimerValue = styled.span<FirstMoveTimerContainerProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props) =>
    props.$isPlayerTurn
      ? props.theme.colors.status.error
      : props.theme.colors.status.success};
`;

export const PlayerTimerContainer = styled.div<PlayerTimerContainerProps>`
  padding: ${(props) => props.theme.layout.timer.height / 6}px;
  margin-bottom: ${(props) => props.theme.layout.timer.height / 6}px;
  border: ${(props) => props.theme.layout.timer.borderWidth}px solid
    ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.layout.timer.borderRadius};
  background-color: ${(props) =>
    props.$isActive
      ? props.theme.colors.backgroundElevated
      : props.theme.colors.background};
`;

export const PlayerName = styled.div`
  color: ${(props) => props.theme.colors.text};
  font-weight: bold;
`;

export const PlayerTimerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const PlayerColorIndicator = styled.div<PlayerColorIndicatorProps>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.color || props.theme.colors.border};
`;

export const PlayerTime = styled.span`
  color: ${(props) => props.theme.colors.text};
`;