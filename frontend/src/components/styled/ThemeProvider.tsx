/**
 * Theme Provider for styled-components
 */

import React, {useMemo} from 'react';
import {ThemeProvider as StyledThemeProvider} from 'styled-components';
import {createTheme} from '../../theme';
import {useTheme} from '../../hooks/useTheme';

import {Theme} from '../../types'; // Твой тип Theme из src/types/index.ts

// Создаём контекст для темы (можно использовать и напрямую styled-components, но контекст полезен для хуков)
export const ThemeContext = React.createContext<Theme | undefined>(undefined);

interface ThemeProviderProps {
    children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
    const {isDark} = useTheme();

    // Динамическая тема на основе текущего режима
    const dynamicTheme: Theme = useMemo(() => createTheme(isDark), [isDark]);

    return (
        <ThemeContext.Provider value={dynamicTheme}>
            <StyledThemeProvider theme={dynamicTheme}>
                {children}
            </StyledThemeProvider>
        </ThemeContext.Provider>
    );
};

export default ThemeProvider;