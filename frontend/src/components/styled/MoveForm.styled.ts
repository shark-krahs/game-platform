/**
 * Styled components for MoveForm
 */

import styled from 'styled-components';
import { Theme } from '../../types'; // Твой тип Theme

// Пропсы для компонентов
interface QuadrantButtonProps {
  selected: boolean;
  quadrant: number; // 0-3
}

interface DirectionButtonProps {
  selected: boolean;
}

interface ConfirmButtonProps {
  disabled?: boolean;
}

// Типизируем styled-компоненты с темой
export const FormContainer = styled.div`
  margin-top: 16px;
  padding: ${(props) => props.theme.layout.form.padding}px;
  border: ${(props) => props.theme.layout.form.borderWidth}px solid
    ${(props) => props.theme.colors.border};
  border-radius: ${(props) => props.theme.layout.form.borderRadius};
`;

export const FormTitle = styled.h4`
  margin: 0 0 16px 0;
  color: ${(props) => props.theme.colors.text};
`;

export const QuadrantButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

export const QuadrantButton = styled.button<QuadrantButtonProps>`
  padding: 8px 12px;
  border: 3px solid
    ${(props) =>
      props.selected
        ? props.theme.colors.black
        : props.theme.colors.quadrant[props.quadrant]};
  background-color: ${(props) =>
    props.selected ? '#e6f7ff' : props.theme.colors.white};
  color: ${(props) =>
    props.selected
      ? props.theme.colors.black
      : props.theme.colors.quadrant[props.quadrant]};
  font-weight: bold;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    opacity: 0.8;
  }
`;

export const DirectionButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

export const DirectionButton = styled.button<DirectionButtonProps>`
  padding: 8px 12px;
  border: 2px solid
    ${(props) =>
      props.selected
        ? props.theme.colors.status.success
        : props.theme.colors.border};
  background-color: ${(props) =>
    props.selected ? '#f6ffed' : props.theme.colors.white};
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    opacity: 0.8;
  }
`;

export const ActionButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
`;

export const ConfirmButton = styled.button<ConfirmButtonProps>`
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.status.info};
  color: ${(props) => props.theme.colors.white};
  border: none;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  border-radius: 4px;

  &:hover:not(:disabled) {
    opacity: 0.8;
  }
`;

export const CancelButton = styled.button`
  padding: 8px 12px;
  background-color: ${(props) => props.theme.colors.status.error};
  color: ${(props) => props.theme.colors.white};
  border: none;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    opacity: 0.8;
  }
`;