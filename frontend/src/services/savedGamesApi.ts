/**
 * API service for saved games functionality
 */
import apiService from './api';
import { SavedGame, SavedGameDetail } from '../types';

export interface SaveGameRequest {
  game_id: string;
  title?: string;
}

export interface SaveGameResponse {
  id: string;
  message: string;
}

class SavedGamesApi {
  /**
   * Get all saved games for the authenticated user
   */
  async getSavedGames(): Promise<SavedGame[]> {
    return apiService.get<SavedGame[]>('/saved-games');
  }

  /**
   * Get a specific saved game with full details
   */
  async getSavedGame(gameId: string): Promise<SavedGameDetail> {
    return apiService.get<SavedGameDetail>(`/saved-games/${gameId}`);
  }

  /**
   * Save a game
   */
  async saveGame(request: SaveGameRequest): Promise<SaveGameResponse> {
    return apiService.post<SaveGameResponse>('/saved-games', request);
  }

  /**
   * Get saved games by game type and category
   */
  async getSavedGamesByCategory(gameType: string, category: string): Promise<SavedGame[]> {
    return apiService.get<SavedGame[]>(`/saved-games/${gameType}/${category}`);
  }

  /**
   * Delete a saved game
   */
  async deleteSavedGame(gameId: string): Promise<{ message: string }> {
    return apiService.delete<{ message: string }>(`/saved-games/${gameId}`);
  }
}

const savedGamesApi = new SavedGamesApi();
export default savedGamesApi;
