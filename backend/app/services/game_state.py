"""
Game state management and broadcasting using GameEngine.
"""
import asyncio
import json
import logging
from typing import Dict, Any, Optional, Set
import uuid

from app.games.base import GameState, TimeControl

logger = logging.getLogger(__name__)

# WebSocket connections per game
game_connections: Dict[str, Dict[str, Any]] = {}  # game_id -> {user_id: websocket, ...}


async def broadcast_to_game(game_id: str, message: Dict[str, Any]):
    """
    Broadcast message to all connected players in a game.

    Args:
        game_id: The game identifier
        message: Message to broadcast
    """
    if game_id in game_connections:
        disconnected = []
        for user_id, ws in game_connections[game_id].items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.debug(f"Failed to send to {user_id} in {game_id}: {e}")
                disconnected.append(user_id)

        # Remove disconnected players
        for user_id in disconnected:
            del game_connections[game_id][user_id]

        if not game_connections[game_id]:
            del game_connections[game_id]


async def add_player_to_game(game_id: str, user_id: str, websocket: Any):
    """
    Add a player to a game's connection list.

    Args:
        game_id: The game identifier
        user_id: The user identifier
        websocket: WebSocket connection
    """
    if game_id not in game_connections:
        game_connections[game_id] = {}

    game_connections[game_id][user_id] = websocket
    logger.debug(f"Player {user_id} connected to game {game_id}")


async def remove_player_from_game(game_id: str, user_id: str):
    """
    Remove a player from a game's connection list.

    Args:
        game_id: The game identifier
        user_id: The user identifier
    """
    if game_id in game_connections and user_id in game_connections[game_id]:
        del game_connections[game_id][user_id]
        if not game_connections[game_id]:
            del game_connections[game_id]
        logger.debug(f"Player {user_id} disconnected from game {game_id}")


async def broadcast_state(game_id: str, game_state: GameState):
    """
    Broadcast current game state to all players in the game.

    Args:
        game_id: The game identifier
        game_state: GameState object
    """
    state = {
        'type': 'state',
        'game_type': game_state.game_type,
        'players': [
            {
                'id': p['id'],
                'name': p.get('name'),
                'color': p.get('color'),
                'remaining': game_state.time_remaining[i]
            } for i, p in enumerate(game_state.players)
        ],
        'status': game_state.status,
        'current_player': game_state.current_player,
        'winner': game_state.winner,
    }

    # Handle board data differently for different games
    if game_state.game_type == 'pentago':
        # For pentago, send board as the grid directly
        state['board'] = game_state.board_state['grid']
    elif game_state.game_type == 'tetris':
        # For tetris, send both board and board_state
        state['board'] = game_state.board_state.get('grid', [])
        state['board_state'] = game_state.board_state
    else:
        # Default: send board_state
        state['board_state'] = game_state.board_state

    # Handle first move timer
    if game_state.status == 'first_move':
        state['first_move_timer'] = game_state.first_move_timer or 0
        state['first_move_player'] = game_state.first_move_player or 0

    await broadcast_to_game(game_id, state)


async def create_matched_game(game_type: str, time_control: str, player1: Any, player2: Any) -> str:
    """
    Create a matched game for two players.

    Args:
        game_type: Type of game
        time_control: Time control string
        player1: First player
        player2: Second player

    Returns:
        Game ID of the created game
    """
    # Route to appropriate game engine based on game type
    if game_type == 'tetris':
        from app.services.tetris_game_engine import tetris_game_engine
        game_engine = tetris_game_engine
    else:
        from app.services.game_engine import game_engine

    game_id = f"match_{uuid.uuid4().hex}"
    total_time = int(time_control.split('+')[0]) * 60 if '+' in time_control else 5 * 60
    increment = int(time_control.split('+')[1]) if '+' in time_control else 3

    logger.info(f"Creating matched game {game_id} for {game_type} {time_control}")

    # Create players list
    players = [
        {
            'id': player1.user_id,
            'name': player1.username,
            'color': '#007bff',
            'user_id': player1.user_id
        },
        {
            'id': player2.user_id,
            'name': player2.username,
            'color': '#dc3545',
            'user_id': player2.user_id
        }
    ]

    time_control_obj = TimeControl(
        type='move_time',
        initial_time=total_time,
        increment=increment
    )

    # Create game using GameEngine
    game_state = await game_engine.create_game(game_id, game_type, players, time_control_obj)

    # Set active game for both players
    from app.repositories.user_active_game_repository import UserActiveGameRepository
    await UserActiveGameRepository.set_active_game(player1.user_id, game_id)
    await UserActiveGameRepository.set_active_game(player2.user_id, game_id)

    # Initialize connections dict for this game
    game_connections[game_id] = {}

    logger.debug(f"Matched game {game_id} created")

    # Notify both players with their assigned colors
    try:
        await player1.ws.send_text(json.dumps({"type": "match_found", "game_id": game_id, "color": "#007bff"}))
        await player2.ws.send_text(json.dumps({"type": "match_found", "game_id": game_id, "color": "#dc3545"}))
        logger.info(f"Match notifications sent to {player1.username} and {player2.username}")
    except Exception as e:
        logger.error(f"Failed to notify players: {e}")

    return game_id


async def handle_player_join(game_id: str, user_id: str, username: str, websocket: Any) -> bool:
    """
    Handle a player joining a game.

    Args:
        game_id: The game identifier
        user_id: The user identifier
        username: The username
        websocket: WebSocket connection

    Returns:
        True if join was successful
    """
    # Check both game engines
    game_state = None
    selected_engine = None

    # Try general game engine first
    from app.services.game_engine import game_engine
    game_state = game_engine.get_game_state(game_id)
    if game_state:
        selected_engine = game_engine
    else:
        # Try Tetris game engine
        from app.services.tetris_game_engine import tetris_game_engine
        game_state = tetris_game_engine.get_game_state(game_id)
        if game_state:
            selected_engine = tetris_game_engine

    if not game_state:
        await websocket.send_text(json.dumps({"type": "error", "message": "Game not found"}))
        return False

    # Check if user is allowed in this game (for matched games)
    if game_id.startswith('match_'):
        allowed_users = {p['user_id'] for p in game_state.players}
        if user_id not in allowed_users:
            await websocket.send_text(json.dumps({"type": "error", "message": "Not allowed in this game"}))
            return False

    # Find the player's index in the game
    player_index = None
    for i, player in enumerate(game_state.players):
        if player['user_id'] == user_id:
            player_index = i
            break

    if player_index is None:
        await websocket.send_text(json.dumps({"type": "error", "message": "Player not found in game"}))
        return False

    # Check if this is a reconnection during disconnect_wait
    if game_state.status == 'disconnect_wait' and game_state.disconnected_player == player_index:
        # Player reconnected, resume the game
        game_state.status = 'playing'  # or whatever the previous status was
        game_state.disconnect_timer = None
        game_state.disconnected_player = None
        logger.info(f"Game {game_id} player {username} reconnected, resuming game")

    # Add to connections
    await add_player_to_game(game_id, user_id, websocket)

    # Send current game state
    await broadcast_state(game_id, game_state)

    logger.info(f"Player {username} ({user_id}) joined game {game_id}")
    return True


async def handle_player_leave(game_id: str, user_id: str):
    """
    Handle a player leaving a game.

    Args:
        game_id: The game identifier
        user_id: The user identifier
    """
    await remove_player_from_game(game_id, user_id)

    # Check both engines for game state
    game_state = None
    selected_engine = None

    # Try general game engine first
    from app.services.game_engine import game_engine
    game_state = game_engine.get_game_state(game_id)
    if game_state:
        selected_engine = game_engine
    else:
        # Try Tetris game engine
        from app.services.tetris_game_engine import tetris_game_engine
        game_state = tetris_game_engine.get_game_state(game_id)
        if game_state:
            selected_engine = tetris_game_engine

    if game_state and game_state.status in ['playing']:
        # Count connected players
        connected_count = len(game_connections.get(game_id, {}))

        if connected_count == 0:
            # Game is completely abandoned
            logger.info(f"Game {game_id} completely abandoned, ending game")
            await selected_engine.end_game(game_id)
            # Clear active games for all players
            from app.repositories.user_active_game_repository import UserActiveGameRepository
            for player in game_state.players:
                if player.get('user_id'):
                    await UserActiveGameRepository.clear_active_game(player['user_id'])
        elif connected_count == 1 and game_state.status != 'finished':
            # One player left, find which one and start disconnection timer
            remaining_user_id = list(game_connections[game_id].keys())[0]

            # Find the disconnected player's index
            disconnected_player_index = None
            for i, player in enumerate(game_state.players):
                if player['user_id'] == user_id:
                    disconnected_player_index = i
                    break

            if disconnected_player_index is not None:
                # Start disconnection wait period
                game_state.status = 'disconnect_wait'
                game_state.disconnect_timer = 30.0  # 30 seconds to reconnect
                game_state.disconnected_player = disconnected_player_index
                logger.info(f"Game {game_id} player {user_id} disconnected, starting 30s reconnection timer")
                await broadcast_state(game_id, game_state)


async def timeout_abandoned_game(game_id: str):
    """
    Handle timeout for abandoned games (when one player leaves).
    """
    await asyncio.sleep(30)

    # Check if still only one player connected
    connected_users = game_connections.get(game_id, {})
    if len(connected_users) != 1:
        return

    logger.info(f"Game {game_id} abandoned by one player, cleaning up")

    # Check both engines for game state
    game_state = None
    selected_engine = None

    # Try general game engine first
    from app.services.game_engine import game_engine
    game_state = game_engine.get_game_state(game_id)
    if game_state:
        selected_engine = game_engine
    else:
        # Try Tetris game engine
        from app.services.tetris_game_engine import tetris_game_engine
        game_state = tetris_game_engine.get_game_state(game_id)
        if game_state:
            selected_engine = tetris_game_engine

    if game_state:
        # Clear active games for all players
        from app.repositories.user_active_game_repository import UserActiveGameRepository
        for player in game_state.players:
            if player.get('user_id'):
                await UserActiveGameRepository.clear_active_game(player['user_id'])

    # End the game
    if selected_engine:
        await selected_engine.end_game(game_id)

    # Clear connections
    if game_id in game_connections:
        del game_connections[game_id]
