/**
 * Main type definitions for the application
 */

// User types
export interface User {
  id: string
  username: string
  email?: string
  email_verified?: boolean
  ratings?: Record<string, GameRating>
  created_at?: string
  language?: string
  stars?: number
  preferred_color?: string
}

export interface GameRating {
  rating: number
  games_played: number
  wins: number
  losses: number
  draws: number
}

// Game types
export interface GameState {
  id: string
  status: GameStatus
  board: (number | null)[][]
  board_state?: any // Generic board state for different games
  currentPlayer: number
  players: Player[]
  winner?: string
  firstMoveTimer?: number
  timeControl?: TimeControl
  created_at: string
  game_type?: string
  moves_history?: GameMove[]
}

export interface GameMove {
  player_id: number
  move_data: any
  timestamp: string
}

export interface ChatMessage {
  user_id: string
  username: string
  message: string
  timestamp: string
}

export interface Player {
  id: number
  name: string
  color: string
  remaining: number
}

export type GameStatus =
  | 'waiting'
  | 'first_move'
  | 'playing'
  | 'disconnect_wait'
  | 'finished'
  | 'abandoned'

export interface TimeControl {
  initial: number // initial time in seconds
  increment: number // increment per move in seconds
  initial_time?: number
}

// Saved Game types
export interface SavedGame {
  id: string
  game_id: string
  game_type: string
  title: string
  description?: string
  status: 'ongoing' | 'finished' | 'abandoned'
  players: Player[]
  current_player: number
  winner?: number
  rated: boolean
  created_at: string
  updated_at: string
  moves_count: number
  time_control?: TimeControl
  category?: 'bullet' | 'blitz' | 'rapid' | 'classical'
}

export interface SavedGameDetail extends SavedGame {
  board_state: any
  time_remaining: Record<number, number>
  moves_history: any[]
  time_control: TimeControl
  moves: GameHistoryMove[]
  chat_history?: ChatMessage[] | string
}

export interface GameHistoryMove {
  move_number: number
  player_id: number
  move_data: any
  board_state_after: any
  timestamp: string
  time_spent: number
}

// API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Component props types
export interface BaseComponentProps {
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

// Theme types
export interface ThemeColors {
  text: string
  textLight: string
  textMuted: string
  background: string
  backgroundElevated: string
  border: string
  borderLight: string
  borderDark: string
}

export interface Theme {
  colors: ThemeColors & {
    quadrant: Record<string, string>
    player: readonly string[]
    status: Record<string, string>
    timer: Record<string, string>
    white: string
    black: string
    transparent: string
    backgroundOverlay: string
  }
  layout: {
    board: {
      size: number
      quadrantSize: number
    }
    cell: {
      size: number
      borderWidth: number
      borderRadius: number
    }
    quadrant: {
      borderWidth: number
      borderRadius: number
      gap: number
      grid: {
        columns: number
        gap: number
      }
    }
    boardGrid: {
      columns: number
      gap: number
    }
    timer: {
      height: number
      panelWidth: number
      borderWidth: number
      borderRadius: number
    }
    form: {
      padding: number
      borderWidth: number
      borderRadius: number
    }
    spacing: Record<string, string>
  }
  typography: {
    fontFamily: string
    fontSize: Record<string, string>
    fontWeight: Record<string, string>
    lineHeight: Record<string, string>
    letterSpacing: Record<string, string>
  }
  shadows: Record<string, string>
  animations: {
    duration: Record<string, string>
    easing: Record<string, string>
  }
  breakpoints: Record<string, string>
}

// Game Engine types
export interface Position {
  x: number;
  y: number;
}

export interface Move {
  type: string;
  data: any;
}

export interface GameEngine {
  id: string;
  name: string;
  boardComponent: React.ComponentType<GameBoardProps>;
  moveFormComponent?: React.ComponentType<MoveFormProps>;
  moveValidator: (move: Move, state: GameState) => boolean;
  getValidMoves: (state: GameState) => Move[];
  getInitialBoard: () => number[][];
  createMove: (gameState: GameState, selectedData: any) => Move | null;
  getMoveFormProps: (gameState: GameState, selectedData: any, handlers: any) => MoveFormProps;
}

export interface GameBoardProps {
  gameState: GameState;
  onCellClick: (position: Position) => void;
  onMoveSubmit?: (move: Move) => void;
  selectedCell?: Position | null;
  selectedQuadrant?: number | null;
  selectedDirection?: string | null;
  onQuadrantSelect?: (quadrant: number) => void;
  onDirectionSelect?: (direction: 'clockwise' | 'counterclockwise') => void;
  onMoveCancel?: () => void;
  readOnly?: boolean;
}

export interface MoveFormProps {
  selectedCell: Position | null;
  selectedQuadrant: number | null;
  selectedDirection: 'clockwise' | 'counterclockwise' | null;
  handleQuadrantSelect: (quadrant: number) => void;
  handleDirectionSelect: (direction: 'clockwise' | 'counterclockwise') => void;
  sendMove: () => void;
  cancelMove: () => void;
  getQuadrantName: (quadrant: number) => string;
  getQuadrantColor?: (quadrant: number) => string;
}

// Utility types

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
}[Keys]

// React types
export type FCWithChildren<P = {}> = React.FC<P & { children?: React.ReactNode }>

export type ComponentPropsWithRef<T extends React.ElementType> = React.ComponentPropsWithRef<T>

// Event types
export interface CustomEventMap {
  'theme:change': CustomEvent<{ isDark: boolean }>
}

declare global {
  interface WindowEventMap extends CustomEventMap {}
}
