"""Bot matchmaking and move logic utilities."""

from __future__ import annotations

import asyncio
import logging
import random
from typing import Any, Dict, Optional

from app.games import GameFactory
from app.games.base import GameState
from app.games.pentago.board import PentagoBoard
from app.services.bot_names import generate_bot_name

logger = logging.getLogger(__name__)

BOT_USER_ID_PREFIX = "bot_"
BOT_WAIT_SECONDS = 5
BOT_RATING_STEP = 200
BOT_BASE_RATING = 0
BOT_MAX_DIFFICULTY = 10
BOT_THINKING_RANGE = (0.6, 1.6)
BOT_BULLET_THINK_MAX = 4.0
BOT_STANDARD_THINK_MAX = 15.0


def is_bot_player(player: Dict[str, Any]) -> bool:
    """Check if player dict represents a bot."""
    return str(player.get("user_id", "")).startswith(BOT_USER_ID_PREFIX)


def calculate_bot_difficulty(player_rating: float) -> int:
    """Calculate bot difficulty (1..BOT_MAX_DIFFICULTY) based on rating step."""
    if player_rating <= 0:
        return 2
    steps = int(player_rating // BOT_RATING_STEP)
    return max(2, min(BOT_MAX_DIFFICULTY, 2 + steps))


def build_bot_profile(player_rating: float, game_type: str) -> Dict[str, Any]:
    """Create bot profile metadata for a match."""
    difficulty = calculate_bot_difficulty(player_rating)
    bot_user_id = f"{BOT_USER_ID_PREFIX}{game_type}_{difficulty}_{random.randint(1000, 9999)}"
    return {
        "user_id": bot_user_id,
        "username": generate_bot_name(),
        "difficulty": difficulty,
        "rating": float(player_rating),
    }


def select_bot_move(game_state: GameState, difficulty: int, think_budget: float) -> Optional[Dict[str, Any]]:
    """Select a bot move based on game state and difficulty."""
    logic = GameFactory.create_game_logic(game_state.game_type)
    valid_moves = logic.get_valid_moves(game_state, game_state.current_player)
    if not valid_moves:
        return None

    # Difficulty bias: higher difficulty -> less randomness
    if game_state.game_type == "pentago":
        return _select_pentago_move(game_state, valid_moves, difficulty, think_budget)
    if game_state.game_type == "tetris":
        return _select_tetris_move(game_state, valid_moves, difficulty)

    return random.choice(valid_moves)


def _select_pentago_move(
        game_state: GameState,
        moves: list,
        difficulty: int,
        think_budget: float,
) -> Dict[str, Any]:
    if difficulty <= 2:
        return random.choice(moves)

    board = PentagoBoard()

    candidate_moves = _ordered_pentago_moves(board, game_state.board_state, game_state.current_player)
    if not candidate_moves:
        candidate_moves = moves

    rating = _get_player_rating(game_state, game_state.current_player)
    depth = _pentago_depth_for_rating(rating)
    depth = max(2, depth)

    max_moves = min(len(candidate_moves), max(10, difficulty * 6))
    candidate_moves = candidate_moves[:max_moves]

    best_score = None
    best_move = candidate_moves[0]
    start_time = asyncio.get_event_loop().time()

    for move in candidate_moves:
        next_board = board.apply_move(game_state.board_state, move, game_state.current_player)
        score = _minimax_pentago(
            board,
            next_board,
            depth - 1,
            False,
            game_state.current_player,
            start_time,
            think_budget,
        )
        if best_score is None or score > best_score:
            best_score = score
            best_move = move

        if asyncio.get_event_loop().time() - start_time >= think_budget:
            break

    return best_move


def _pentago_depth_for_rating(rating: float) -> int:
    if rating < 1000:
        return 2
    if rating < 1500:
        return 4
    if rating < 2000:
        return 6
    if rating < 3000:
        return 8
    return 9


def _ordered_pentago_moves(board: PentagoBoard, board_state: Dict[str, Any], player_id: int) -> list:
    moves = _get_pentago_valid_moves(board_state)
    scored = []
    for move in moves:
        next_board = board.apply_move(board_state, move, player_id)
        score = _evaluate_pentago(board, next_board, player_id)
        scored.append((score, move))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored]


def _minimax_pentago(
        board: PentagoBoard,
        board_state: Dict[str, Any],
        depth: int,
        maximizing: bool,
        root_player: int,
        start_time: float,
        think_budget: float,
) -> float:
    winner = board.check_winner(board_state)
    if winner is not None:
        return 10000 if winner == root_player else -10000

    if depth <= 0 or asyncio.get_event_loop().time() - start_time >= think_budget:
        return _evaluate_pentago(board, board_state, root_player)

    player = root_player if maximizing else (root_player + 1) % 2
    moves = _get_pentago_valid_moves(board_state)
    if not moves:
        return _evaluate_pentago(board, board_state, root_player)

    if maximizing:
        best = float("-inf")
        for move in moves:
            next_board = board.apply_move(board_state, move, player)
            score = _minimax_pentago(board, next_board, depth - 1, False, root_player, start_time, think_budget)
            best = max(best, score)
            if asyncio.get_event_loop().time() - start_time >= think_budget:
                break
        return best

    best = float("inf")
    for move in moves:
        next_board = board.apply_move(board_state, move, player)
        score = _minimax_pentago(board, next_board, depth - 1, True, root_player, start_time, think_budget)
        best = min(best, score)
        if asyncio.get_event_loop().time() - start_time >= think_budget:
            break
    return best


def _evaluate_pentago(board: PentagoBoard, board_state: Dict[str, Any], player_id: int) -> float:
    opponent = (player_id + 1) % 2
    player_score = _count_sequences(board_state, player_id)
    opponent_score = _count_sequences(board_state, opponent)
    return player_score - opponent_score


def _count_sequences(board_state: Dict[str, Any], player_id: int) -> int:
    grid = board_state.get("grid", [])
    if not grid:
        return 0

    size = len(grid)
    score = 0

    def score_line(line):
        total = 0
        for i in range(len(line) - 3):
            window = line[i:i + 4]
            if all(cell in (None, player_id) for cell in window) and any(cell == player_id for cell in window):
                total += window.count(player_id)
        return total

    for row in grid:
        score += score_line(row)

    for col in range(size):
        score += score_line([grid[row][col] for row in range(size)])

    for start_row in range(size - 3):
        for start_col in range(size - 3):
            diag = [grid[start_row + i][start_col + i] for i in range(4)]
            score += score_line(diag)
            anti = [grid[start_row + i][start_col + 3 - i] for i in range(4)]
            score += score_line(anti)

    return score


def _get_pentago_valid_moves(board_state: Dict[str, Any]) -> list:
    moves = []
    grid = board_state.get("grid", [])

    for y in range(len(grid)):
        for x in range(len(grid[y])):
            if grid[y][x] is None:
                for quadrant in range(4):
                    for direction in ["clockwise", "counterclockwise"]:
                        moves.append({
                            "x": x,
                            "y": y,
                            "quadrant": quadrant,
                            "direction": direction,
                        })

    return moves


def _select_tetris_move(game_state: GameState, moves: list, difficulty: int) -> Dict[str, Any]:
    if difficulty <= 2:
        return random.choice(moves)

    # Prefer moves that clear lines or reduce stack height
    best_moves = []
    best_score = None

    logic = GameFactory.create_game_logic(game_state.game_type)

    for move in moves:
        next_state, _ = logic.process_move(game_state, move, game_state.current_player)
        lines_cleared = next_state.board_state.get("lines_cleared", 0)
        grid = next_state.board_state.get("grid", [])
        height_penalty = _estimate_stack_height(grid)
        score = (lines_cleared * 10) - height_penalty
        if best_score is None or score > best_score:
            best_score = score
            best_moves = [move]
        elif score == best_score:
            best_moves.append(move)

    return random.choice(best_moves) if best_moves else random.choice(moves)


def _estimate_stack_height(grid: list) -> int:
    height = 0
    for y in range(len(grid)):
        if any(cell != 0 for cell in grid[y]):
            height = len(grid) - y
            break
    return height


async def schedule_bot_move(
        game_state: GameState,
        game_id: str,
        difficulty: int,
        selected_engine: Any,
) -> None:
    """Schedule a bot move after a short delay."""
    await asyncio.sleep(random.uniform(*BOT_THINKING_RANGE))

    latest_state = selected_engine.get_game_state(game_id)
    if not latest_state:
        return

    if latest_state.status not in ["first_move", "playing", "disconnect_wait"]:
        return

    if latest_state.current_player >= len(latest_state.players):
        return

    if not is_bot_player(latest_state.players[latest_state.current_player]):
        return

    if latest_state.game_type == "tetris":
        await _play_tetris_turn(latest_state, game_id, difficulty, selected_engine)
    else:
        think_budget = _calculate_think_budget(latest_state)
        move = select_bot_move(latest_state, difficulty, think_budget)
        if move is None:
            return
        await selected_engine.process_move(game_id, latest_state.current_player, move)

    logger.info(
        "Bot move executed",
        extra={
            "game_id": game_id,
            "game_type": latest_state.game_type,
            "difficulty": difficulty,
        },
    )


async def _play_tetris_turn(
        game_state: GameState,
        game_id: str,
        difficulty: int,
        selected_engine: Any,
) -> None:
    board_state = game_state.board_state or {}
    falling_piece = board_state.get("falling_piece")
    if not falling_piece:
        return

    grid = board_state.get("grid", [])
    width = board_state.get("width") or (len(grid[0]) if grid else 10)

    target_rotation = random.randint(0, 3) if difficulty <= 3 else random.randint(0, 3)
    target_x = random.randint(0, max(0, width - 1))

    rotation_steps = (target_rotation - falling_piece.get("rotation", 0)) % 4
    for _ in range(rotation_steps):
        await selected_engine.process_move(
            game_id,
            game_state.current_player,
            {"action": "move", "direction": "rotate"},
        )

    current_x = falling_piece.get("x", 0)
    dx = target_x - current_x
    direction = "right" if dx > 0 else "left"
    for _ in range(abs(dx)):
        await selected_engine.process_move(
            game_id,
            game_state.current_player,
            {"action": "move", "direction": direction},
        )

    await selected_engine.process_move(
        game_id,
        game_state.current_player,
        {"action": "lock"},
    )


def _calculate_think_budget(game_state: GameState) -> float:
    time_control = getattr(game_state, "time_control", None)
    if time_control and time_control.increment <= 6:
        return BOT_BULLET_THINK_MAX
    return BOT_STANDARD_THINK_MAX


def _get_player_rating(game_state: GameState, player_id: int) -> float:
    try:
        return float(game_state.players[player_id].get("rating", 0))
    except Exception:
        return 0.0
