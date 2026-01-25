/**
 * App Background component - manages background images or solid colors
 * Provides a flexible background system that works with AppHeader overlay
 */

import React from 'react';
import styled from 'styled-components';

interface AppBackgroundProps {
  $backgroundImage?: string;    // URL изображения фона
  $backgroundColor?: string;    // Цвет фона, если нет изображения
  $hasOverlay?: boolean;        // Добавить полупрозрачный оверлей
  $hasBlur?: boolean;           // Добавить лёгкий блюр
}

const BackgroundContainer = styled.div<AppBackgroundProps>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;

  background: ${({ $backgroundImage, $backgroundColor }) => {
    if ($backgroundImage) {
      return `
        linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)),
        url(${$backgroundImage})
      `;
    }
    return $backgroundColor || '#888888';
  }};

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;

  transition: background 0.3s ease-in-out;

  @media (max-width: 768px) {
    background-attachment: scroll; /* Fixed может глючить на мобильных */
  }
`;

const BackgroundOverlay = styled.div<Pick<AppBackgroundProps, '$hasOverlay' | '$hasBlur'>>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  background: ${({ $hasOverlay }) =>
    $hasOverlay ? 'rgba(0, 0, 0, 0.2)' : 'transparent'};

  backdrop-filter: ${({ $hasBlur }) => ($hasBlur ? 'blur(1px)' : 'none')};
`;

const AppBackground: React.FC<AppBackgroundProps> = ({
  $backgroundImage,
  $backgroundColor,
  $hasOverlay = false,
  $hasBlur = false,
}) => {
  return (
    <BackgroundContainer
      $backgroundImage={$backgroundImage}
      $backgroundColor={$backgroundColor}
      $hasOverlay={$hasOverlay}
      $hasBlur={$hasBlur}
    >
      <BackgroundOverlay $hasOverlay={$hasOverlay} $hasBlur={$hasBlur} />
    </BackgroundContainer>
  );
};

export default AppBackground;
