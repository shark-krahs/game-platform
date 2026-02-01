# Game Platform Frontend

## 🚀 TypeScript-Only Policy

This project uses **TypeScript exclusively**. JavaScript files (`.js`/`.jsx`) are not allowed.

### ✅ What to Use

- `.ts` - TypeScript files (utilities, constants, services)
- `.tsx` - TypeScript React components
- `.d.ts` - Type declarations

### ❌ What NOT to Use

- `.js` - JavaScript files
- `.jsx` - JavaScript React components

## 📋 Development Scripts

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting (TypeScript only)
npm run lint
npm run lint:fix

# Build (with type checking)
npm run build
```

## 🛠️ Project Structure

```
src/
├── components/          # React components (.tsx)
│   ├── common/         # Shared components
│   ├── game/          # Game-specific components
│   ├── layout/        # Layout components
│   └── styled/        # Styled components
├── constants/          # Constants (.ts)
├── hooks/             # Custom hooks (.ts/.tsx)
├── services/          # API services (.ts)
├── types/             # Type definitions (.ts)
├── utils/             # Utility functions (.ts)
└── locales/           # i18n files (.json)
```

## 📝 TypeScript Configuration

### Strict Mode Enabled

- `strict: true` - All strict checks enabled
- `noImplicitAny: true` - No implicit any types
- `strictNullChecks: true` - Strict null checking
- `noUnusedLocals` - No unused variables

### Path Aliases

```typescript
import { User } from '@/types'          // src/types
import { api } from '@/services/api'    // src/services/api
```

## 🔧 ESLint Rules

### JavaScript Files Forbidden

ESLint will **block** any JavaScript files with error:

```
JavaScript files are not allowed. Use TypeScript (.ts/.tsx) instead.
```

### TypeScript Best Practices

- No `any` types (warning)
- Prefer optional chaining (`?.`)
- Prefer nullish coalescing (`??`)
- No unused variables

## 🚀 Migration Guide

### Converting Existing Files

1. **Rename extension**: `.js` → `.ts`, `.jsx` → `.tsx`
2. **Add types** to function parameters and return values
3. **Import types** from `@/types`
4. **Run type check**: `npm run type-check`

### Example Migration

**Before (JavaScript):**

```javascript
// utils.js
export const formatTime = (seconds) => {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}
```

**After (TypeScript):**

```typescript
// utils.ts
export const formatTime = (seconds: number): string => {
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}
```

## 🧪 Type Definitions

### Core Types

```typescript
interface User {
  id: number
  username: string
  ratings?: Record<string, GameRating>
}

interface GameState {
  id: string
  status: GameStatus
  board: number[][]
  players: Player[]
}
```

### API Types

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    total: number
  }
}
```

## 🎯 Benefits of TypeScript

- **Compile-time error checking**
- **Better IDE support** (IntelliSense, refactoring)
- **Self-documenting code** (types as documentation)
- **Safer refactoring** (catch breaking changes)
- **Better developer experience**

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React TypeScript Guide](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)

---

**Remember**: All new code must be written in TypeScript. JavaScript files will be rejected by ESLint.
