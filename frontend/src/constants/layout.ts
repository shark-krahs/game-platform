/**
 * Layout and styling constants
 */

// Board dimensions
export const BOARD_SIZE = 8
export const CELL_SIZE = 40
export const QUADRANT_SIZE = 4

// Panel dimensions
export const TIMERS_PANEL_WIDTH = 300
export const GAME_PADDING = 20
export const FORM_PADDING = 16

// Spacing
export const QUADRANT_GAP = 2
export const CELL_GAP = 1

// Grid layouts
export const QUADRANT_GRID_COLUMNS = 2
export const QUADRANT_GRID_GAP = 2
export const BOARD_GRID_COLUMNS = 2
export const BOARD_GRID_GAP = 4

// Border dimensions
export const CELL_BORDER_WIDTH = 1
export const QUADRANT_BORDER_WIDTH = 2
export const TIMER_BORDER_WIDTH = 1
export const FORM_BORDER_WIDTH = 1

// Border radius
export const CELL_BORDER_RADIUS = 2
export const QUADRANT_BORDER_RADIUS = 4
export const TIMER_BORDER_RADIUS = 4
export const FORM_BORDER_RADIUS = 4

// Timer dimensions
export const TIMER_HEIGHT = 60

// Z-index layers
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  SKIP_LINK: 1070,
  TOOLTIP: 1080,
  NOTIFICATION: 1090
} as const

// Responsive breakpoints
export const BREAKPOINTS = {
  XS: '0px',
  SM: '576px',
  MD: '768px',
  LG: '992px',
  XL: '1200px',
  XXL: '1400px'
} as const

// Container max widths
export const CONTAINER_MAX_WIDTHS = {
  SM: '540px',
  MD: '720px',
  LG: '960px',
  XL: '1140px',
  XXL: '1320px'
} as const

// Spacing scale
export const SPACING = {
  NONE: '0',
  XS: '0.25rem',    // 4px
  SM: '0.5rem',     // 8px
  MD: '1rem',       // 16px
  LG: '1.5rem',     // 24px
  XL: '2rem',       // 32px
  XXL: '3rem',      // 48px
  XXXL: '4rem'      // 64px
} as const

// Font sizes
export const FONT_SIZE = {
  XS: '0.75rem',    // 12px
  SM: '0.875rem',   // 14px
  BASE: '1rem',     // 16px
  LG: '1.125rem',   // 18px
  XL: '1.25rem',    // 20px
  XXL: '1.5rem',    // 24px
  XXXL: '2rem',     // 32px
  XXXXL: '2.5rem'   // 40px
} as const

// Font weights
export const FONT_WEIGHT = {
  LIGHT: 300,
  NORMAL: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700,
  EXTRABOLD: 800
} as const

// Line heights
export const LINE_HEIGHT = {
  NONE: 1,
  TIGHT: 1.25,
  SNUG: 1.375,
  NORMAL: 1.5,
  RELAXED: 1.625,
  LOOSE: 2
} as const

// Shadows
export const SHADOW = {
  NONE: 'none',
  XS: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  SM: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  MD: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  LG: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  XL: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  XXL: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  INNER: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
} as const

// Transitions
export const TRANSITION = {
  FAST: '150ms ease-in-out',
  NORMAL: '300ms ease-in-out',
  SLOW: '500ms ease-in-out'
} as const

// Layout constants for specific components
export const COMPONENT_LAYOUT = {
  HEADER_HEIGHT: '64px',
  FOOTER_HEIGHT: '60px',
  SIDEBAR_WIDTH: '280px',
  SIDEBAR_COLLAPSED_WIDTH: '80px',

  // Game layout
  GAME_BOARD_MARGIN: '20px',
  TIMER_PANEL_WIDTH: '300px',
  CHAT_PANEL_WIDTH: '280px',

  // Form layouts
  FORM_MAX_WIDTH: '400px',
  INPUT_HEIGHT: '40px',

  // Card layouts
  CARD_PADDING: '16px',
  CARD_BORDER_RADIUS: '8px',

  // Button layouts
  BUTTON_HEIGHT: '40px',
  BUTTON_PADDING: '8px 16px'
} as const
