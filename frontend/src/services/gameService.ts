/**
 * Game service - handles game-related API operations
 */

import api from "./api";

// Типы ответов от бэкенда (можно расширять по мере необходимости)
interface TimeControl {
  total: number;
  increment: number;
}

interface GameSettings {
  timeControls: {
    bullet: TimeControl;
    blitz: TimeControl;
    rapid: TimeControl;
  };
  gameTypes: string[];
}

interface WaitingGame {
  // Добавь поля, которые приходят от /games/waiting
  id: string;
  // ... другие поля
}

interface CreatedGameResponse {
  game_id: string;
  // ... другие поля
}

class GameService {
  async getWaitingGames(): Promise<WaitingGame[]> {
    try {
      const response = await api.get<WaitingGame[]>("/games/waiting");
      return response;
    } catch (error) {
      throw new Error(
        (error as Error).message || "Failed to get waiting games",
      );
    }
  }

  async createGame(
    totalMinutes: number,
    incrementSeconds: number,
  ): Promise<CreatedGameResponse> {
    try {
      const response = await api.post<CreatedGameResponse>("/games/find", {
        total_minutes: totalMinutes,
        increment_seconds: incrementSeconds,
      });
      return response;
    } catch (error) {
      throw new Error((error as Error).message || "Failed to create game");
    }
  }

  // Можно расширить реальным запросом к бэкенду позже
  async getGameSettings(): Promise<GameSettings> {
    return {
      timeControls: {
        bullet: { total: 3, increment: 0 },
        blitz: { total: 5, increment: 3 },
        rapid: { total: 15, increment: 10 },
      },
      gameTypes: ["tic-tac-toe"],
    };
  }
}

// Singleton instance
const gameService = new GameService();

export { GameService };
export default gameService;
