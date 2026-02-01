/**
 * Local storage keys and configuration
 */

// Storage keys
export const STORAGE_KEYS = {
    // Authentication
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',

    // User preferences
    THEME: 'theme',
    LANGUAGE: 'language',
    SOUND_ENABLED: 'sound_enabled',
    NOTIFICATIONS_ENABLED: 'notifications_enabled',
    USER_PREFERENCES: 'user_preferences',

    // Game settings
    GAME_SETTINGS: 'game_settings',
    DEFAULT_TIME_CONTROL: 'default_time_control',
    AUTO_QUEUE: 'auto_queue',
    SOUND_VOLUME: 'sound_volume',

    // UI state
    SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    LAST_GAME_MODE: 'last_game_mode',
    CHAT_VISIBLE: 'chat_visible',

    // Cache keys
    GAME_HISTORY_CACHE: 'game_history_cache',
    USER_RATINGS_CACHE: 'user_ratings_cache',
    FRIENDS_LIST_CACHE: 'friends_list_cache',

    // Session data
    CURRENT_GAME_ID: 'current_game_id',
    LAST_ACTIVITY: 'last_activity',
    SESSION_START: 'session_start'
} as const

// Storage configuration
export const STORAGE_CONFIG = {
    // Cache TTL in milliseconds
    CACHE_TTL: {
        USER_DATA: 24 * 60 * 60 * 1000,      // 24 hours
        GAME_HISTORY: 60 * 60 * 1000,        // 1 hour
        RATINGS: 30 * 60 * 1000,             // 30 minutes
        FRIENDS_LIST: 15 * 60 * 1000         // 15 minutes
    },

    // Storage size limits
    MAX_SIZE: {
        USER_DATA: 1024 * 1024,              // 1MB
        GAME_HISTORY: 5 * 1024 * 1024,       // 5MB
        CACHE_TOTAL: 10 * 1024 * 1024        // 10MB total
    },

    // Compression settings
    COMPRESSION: {
        ENABLED: true,
        THRESHOLD: 1024,                     // Compress if > 1KB
        ALGORITHM: 'gzip'
    }
} as const

// Storage events
export const STORAGE_EVENTS = {
    THEME_CHANGED: 'theme_changed',
    LANGUAGE_CHANGED: 'language_changed',
    USER_DATA_UPDATED: 'user_data_updated',
    GAME_STARTED: 'game_started',
    GAME_ENDED: 'game_ended'
} as const

export type StorageEvent = typeof STORAGE_EVENTS[keyof typeof STORAGE_EVENTS]

// Storage cleanup configuration
export const STORAGE_CLEANUP = {
    // Auto cleanup interval (24 hours)
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,

    // Keys to preserve during cleanup
    PRESERVE_KEYS: [
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_PREFERENCES,
        STORAGE_KEYS.THEME,
        STORAGE_KEYS.LANGUAGE
    ],

    // Maximum age for cache entries (7 days)
    MAX_CACHE_AGE: 7 * 24 * 60 * 60 * 1000
} as const

// Storage validation
export const STORAGE_VALIDATION = {
    // Maximum key length
    MAX_KEY_LENGTH: 100,

    // Maximum value size (10MB)
    MAX_VALUE_SIZE: 10 * 1024 * 1024,

    // Allowed characters in keys (alphanumeric, underscore, dash)
    KEY_PATTERN: /^[a-zA-Z0-9_-]+$/,

    // Reserved prefixes
    RESERVED_PREFIXES: ['temp_', 'cache_', 'session_']
} as const

// Migration helpers
export const STORAGE_MIGRATION = {
    // Old keys that need migration
    LEGACY_KEYS: {
        'darkMode': STORAGE_KEYS.THEME,
        'userToken': STORAGE_KEYS.AUTH_TOKEN,
        'gamePrefs': STORAGE_KEYS.GAME_SETTINGS
    },

    // Migration version
    CURRENT_VERSION: '2.0.0',

    // Migration steps
    MIGRATION_STEPS: [
        {
            version: '1.0.0',
            migrate: (data: any) => ({
                ...data,
                theme: data.darkMode ? 'dark' : 'light'
            })
        }
    ]
} as const
