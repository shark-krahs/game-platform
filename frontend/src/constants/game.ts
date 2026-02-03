/**
 * Game-specific constants
 */

// Game status constants
export const GAME_STATUS = {
  WAITING: "waiting",
  FIRST_MOVE: "first_move",
  PLAYING: "playing",
  DISCONNECT_WAIT: "disconnect_wait",
  FINISHED: "finished",
  ABANDONED: "abandoned",
} as const;

export type GameStatusType = (typeof GAME_STATUS)[keyof typeof GAME_STATUS];

// Game result constants
export const GAME_RESULT = {
  WIN: "win",
  LOSS: "loss",
  DRAW: "draw",
  ABANDONED: "abandoned",
} as const;

export type GameResult = (typeof GAME_RESULT)[keyof typeof GAME_RESULT];

// Player colors for games
export const PLAYER_COLORS = {
  RED: "#ff0000",
  BLUE: "#0000ff",
  GREEN: "#00ff00",
  YELLOW: "#ffff00",
  PURPLE: "#800080",
  ORANGE: "#ffa500",
  PINK: "#ffc0cb",
  CYAN: "#00ffff",
} as const;

export type PlayerColor = (typeof PLAYER_COLORS)[keyof typeof PLAYER_COLORS];

// Move directions
export const MOVE_DIRECTIONS = {
  CLOCKWISE: "clockwise",
  COUNTERCLOCKWISE: "counterclockwise",
} as const;

export type MoveDirectionType =
  (typeof MOVE_DIRECTIONS)[keyof typeof MOVE_DIRECTIONS];

// Game phases
export const GAME_PHASES = {
  SETUP: "setup",
  FIRST_MOVE: "first_move",
  PLAYING: "playing",
  FINISHED: "finished",
} as const;

export type GamePhase = (typeof GAME_PHASES)[keyof typeof GAME_PHASES];

// Default time controls
export const DEFAULT_TIME_CONTROLS = {
  BULLET: { initial: 60, increment: 0 }, // 1+0
  BLITZ: { initial: 180, increment: 2 }, // 3+2
  RAPID: { initial: 600, increment: 5 }, // 10+5
  CLASSICAL: { initial: 2700, increment: 30 }, // 45+30
} as const;

export type TimeControlPreset = keyof typeof DEFAULT_TIME_CONTROLS;

// Game configuration
export const GAME_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  BOARD_SIZE: 8,
  QUADRANT_SIZE: 4,
  MAX_GAME_TIME: 24 * 60 * 60, // 24 hours in seconds
  MIN_GAME_TIME: 30, // 30 seconds
  MAX_INCREMENT: 300, // 5 minutes
  MIN_INCREMENT: 0,
} as const;

// Win conditions
export const WIN_CONDITIONS = {
  CONNECT_FOUR: 4, // Connect 4 pieces in a row
  CONNECT_FIVE: 5, // Connect 5 pieces in a row
  CONNECT_SIX: 6, // Connect 6 pieces in a row
} as const;

// Game modes
export const GAME_MODES = {
  CASUAL: "casual",
  RATED: "rated",
  TOURNAMENT: "tournament",
  FRIENDLY: "friendly",
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];

// Rating system constants
export const RATING_SYSTEM = {
  INITIAL_RATING: 1500,
  K_FACTOR: 32, // Rating change factor
  MIN_RATING: 100,
  MAX_RATING: 3000,
  PROVISIONAL_GAMES: 10, // Number of games before rating stabilizes
} as const;

// Game events
export const GAME_EVENTS = {
  GAME_STARTED: "game_started",
  MOVE_MADE: "move_made",
  PLAYER_JOINED: "player_joined",
  PLAYER_LEFT: "player_left",
  GAME_FINISHED: "game_finished",
  TIME_UP: "time_up",
  DRAW_OFFERED: "draw_offered",
  DRAW_ACCEPTED: "draw_accepted",
  RESIGNATION: "resignation",
} as const;

export type GameEvent = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];

// Chat constants
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 200,
  MAX_MESSAGES_PER_GAME: 100,
  MESSAGE_COOLDOWN: 1000, // 1 second between messages
  ALLOWED_EMOJIS: ["👍", "👎", "😀", "😢", "😮", "🤔", "🎉", "💪"],
} as const;

// Spectating
export const SPECTATOR_CONFIG = {
  ALLOW_SPECTATORS: true,
  MAX_SPECTATORS: 10,
  SPECTATOR_CHAT: true,
} as const;

// Game validation
export const GAME_VALIDATION = {
  MAX_MOVE_TIME: 30000, // 30 seconds to make a move
  MAX_GAME_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  ALLOW_UNDO: false,
  ALLOW_PAUSE: false,
} as const;
