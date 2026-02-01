/**
 * Theme configuration - combines colors, layout, and other design tokens
 */

import {PLAYER_COLORS, QUADRANT_COLORS, STATUS_COLORS, TIMER_COLORS,} from './constants/colors';

import {
    BOARD_GRID_COLUMNS,
    BOARD_GRID_GAP,
    BOARD_SIZE,
    CELL_BORDER_RADIUS,
    CELL_BORDER_WIDTH,
    CELL_SIZE,
    FORM_BORDER_RADIUS,
    FORM_BORDER_WIDTH,
    FORM_PADDING,
    GAME_PADDING,
    QUADRANT_BORDER_RADIUS,
    QUADRANT_BORDER_WIDTH,
    QUADRANT_GAP,
    QUADRANT_GRID_COLUMNS,
    QUADRANT_GRID_GAP,
    QUADRANT_SIZE,
    TIMER_BORDER_RADIUS,
    TIMER_BORDER_WIDTH,
    TIMER_HEIGHT,
    TIMERS_PANEL_WIDTH,
} from './constants/layout';

import {Theme} from './types'; // Твой тип Theme из src/types/index.ts

/**
 * Creates theme object based on dark/light mode
 */
export const createTheme = (isDark: boolean = false): Theme => ({
    colors: {
        quadrant: QUADRANT_COLORS,
        player: PLAYER_COLORS,
        status: STATUS_COLORS,
        timer: TIMER_COLORS,

        white: '#ffffff',
        black: '#000000',
        transparent: 'transparent',

        border: isDark ? '#434343' : '#cccccc',
        borderLight: isDark ? '#595959' : '#e6e6e6',
        borderDark: isDark ? '#262626' : '#999999',

        text: isDark ? '#ffffff' : '#333333',
        textLight: isDark ? '#cccccc' : '#666666',
        textMuted: isDark ? '#999999' : '#999999',

        background: isDark ? '#1f1f1f' : '#ffffff',
        backgroundElevated: isDark ? '#262626' : '#f9f9f9',
        backgroundOverlay: 'rgba(0, 0, 0, 0.5)',
    },

    layout: {
        board: {
            size: BOARD_SIZE,
            quadrantSize: QUADRANT_SIZE,
        },

        cell: {
            size: CELL_SIZE,
            borderWidth: CELL_BORDER_WIDTH,
            borderRadius: CELL_BORDER_RADIUS,
        },

        quadrant: {
            borderWidth: QUADRANT_BORDER_WIDTH,
            borderRadius: QUADRANT_BORDER_RADIUS,
            gap: QUADRANT_GAP,
            grid: {
                columns: QUADRANT_GRID_COLUMNS,
                gap: QUADRANT_GRID_GAP,
            },
        },

        boardGrid: {
            columns: BOARD_GRID_COLUMNS,
            gap: BOARD_GRID_GAP,
        },

        timer: {
            height: TIMER_HEIGHT,
            panelWidth: TIMERS_PANEL_WIDTH,
            borderWidth: TIMER_BORDER_WIDTH,
            borderRadius: TIMER_BORDER_RADIUS,
        },

        form: {
            padding: FORM_PADDING,
            borderWidth: FORM_BORDER_WIDTH,
            borderRadius: FORM_BORDER_RADIUS,
        },

        spacing: {
            gamePadding: `${GAME_PADDING}`,
            small: '4px',
            medium: '8px',
            large: '16px',
            xlarge: '24px',
        },
    },

    typography: {
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
        fontSize: {
            xs: '10px',
            small: '12px',
            medium: '14px',
            large: '16px',
            xlarge: '18px',
            xxlarge: '24px',
            xxxlarge: '32px',
        },
        fontWeight: {
            light: '300',
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
            extrabold: '800',
        },
        lineHeight: {
            tight: '1.2',
            normal: '1.5',
            relaxed: '1.625',
            loose: '1.8',
        },
        letterSpacing: {
            tight: '-0.025em',
            normal: '0',
            wide: '0.025em',
        },
    },

    shadows: {
        small: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        medium: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
        large: '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
    },

    animations: {
        duration: {
            fast: '0.2s',
            normal: '0.3s',
            slow: '0.5s',
        },
        easing: {
            easeIn: 'ease-in',
            easeOut: 'ease-out',
            easeInOut: 'ease-in-out',
        },
    },

    breakpoints: {
        mobile: '576px',
        tablet: '768px',
        desktop: '1024px',
        large: '1200px',
    },
});

// Default light theme
export const theme = createTheme(false);
export default theme;

// Helper functions
export const getQuadrantColor = (quadrant: number): string => {
    const index = Math.max(0, Math.min(3, quadrant));
    return QUADRANT_COLORS[index as keyof typeof QUADRANT_COLORS] ?? '#888888';
};

export const getPlayerColor = (index: number): string => {
    return PLAYER_COLORS[index % PLAYER_COLORS.length] ?? '#cccccc';
};

export const getStatusColor = (status: string): string =>
    STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.info;
