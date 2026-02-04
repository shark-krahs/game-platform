import { GameEngine } from "../types";
import { PentagoEngine } from "./pentago/PentagoEngine";
import { TetrisEngine } from "./tetris/TetrisEngine";

// Registry for all game engines
export const gameEngines: Record<string, GameEngine> = {};

// Function to register a game engine
export function registerGameEngine(engine: GameEngine): void {
  gameEngines[engine.id] = engine;
}

// Function to get a game engine by id
export function getGameEngine(gameType: string): GameEngine | null {
  return gameEngines[gameType] || null;
}

// Function to get all available game types
export function getAvailableGameTypes(): string[] {
  return Object.keys(gameEngines);
}

// Initialize game engines
registerGameEngine(new PentagoEngine());
registerGameEngine(new TetrisEngine());
