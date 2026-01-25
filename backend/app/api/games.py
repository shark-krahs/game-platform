import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
import json, random, uuid
from jose import JWTError, jwt
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.core.config import settings
from app.api.auth import get_current_user, get_user_from_token, oauth2_scheme
from app.matchmaking import *
from app.ratings import RatingCalculator, get_time_control_type
from app.services.game_config import get_settings, PRESET_IDS, generate_player_color
from app.services.game_state import handle_player_join, handle_player_leave, create_matched_game
from app.repositories.saved_game_repository import SavedGameRepository
from app.db.models import SavedGame

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/games/waiting")
async def get_waiting_games():
    """Get list of waiting games."""
    from app.services.game_state import games
    result = []
    for game_id, g in games.items():
        if g['status'] == 'waiting' and len(g['players']) == 1 and game_id not in PRESET_IDS:
            result.append({
                'game_id': game_id,
                'total_time': g['total_time'],
                'increment': g['increment']
            })
    return result

@router.post("/games/find")
async def find_game(total_minutes: int, increment_seconds: int):
    """Find or create a game with specified time controls."""
    from app.services.game_state import games
    from app.services.game_engine import game_engine
    from app.games.base import TimeControl

    game_id = f"{total_minutes}+{increment_seconds}"
    if game_id not in games:
        # Create game using GameEngine
        time_control = TimeControl(
            type='classical',
            initial_time=total_minutes * 60,
            increment=increment_seconds
        )
        # Create dummy players for waiting games
        players = [
            {'id': 'waiting_player_0', 'name': 'Waiting Player 1', 'color': '#007bff', 'user_id': None},
            {'id': 'waiting_player_1', 'name': 'Waiting Player 2', 'color': '#dc3545', 'user_id': None}
        ]
        await game_engine.create_game(game_id, 'pentago', players, time_control)

        # Store legacy format for WebSocket compatibility
        games[game_id] = {
            'players': [],
            'game_type': 'pentago',
            'total_time': total_minutes * 60,
            'increment': increment_seconds,
            'lock': asyncio.Lock(),
            'status': 'waiting',
        }

    return {"game_id": game_id}

@router.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    """WebSocket endpoint for game connections."""
    await websocket.accept()

    # Get user from token
    token = websocket.query_params.get("token")
    user = None
    user_id = None
    username = "Anonymous"

    if token:
        user = await get_user_from_token(token)
        if user:
            user_id = str(user.id)
            username = user.username

    if not user_id:
        await websocket.send_text(json.dumps({"type": "error", "message": "Authentication required"}))
        return

    try:
        # Handle player joining
        success = await handle_player_join(game_id, user_id, username, websocket)
        if not success:
            return

        # Main message loop
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                await websocket.send_text(json.dumps({'type':'error','message':'invalid json'}))
                continue

            action = msg.get('type')

            if action == 'move':
                # Get game state from appropriate engine
                game_state = None
                selected_engine = None

                # Try Tetris engine first
                from app.services.tetris_game_engine import tetris_game_engine
                game_state = tetris_game_engine.get_game_state(game_id)
                if game_state:
                    selected_engine = tetris_game_engine
                else:
                    # Try general game engine
                    from app.services.game_engine import game_engine
                    game_state = game_engine.get_game_state(game_id)
                    if game_state:
                        selected_engine = game_engine

                if not game_state or game_state.status not in ['first_move', 'playing', 'disconnect_wait']:
                    await websocket.send_text(json.dumps({'type':'error','message':'game not in playing state'}))
                    continue

                # Find player index
                player_index = None
                for i, player in enumerate(game_state.players):
                    if player['user_id'] == user_id:
                        player_index = i
                        break

                if player_index is None:
                    await websocket.send_text(json.dumps({'type':'error','message':'player not found'}))
                    continue

                # Process move
                move_data = {k: v for k, v in msg.items() if k != 'type'}
                valid = await selected_engine.process_move(game_id, player_index, move_data)

                if not valid:
                    await websocket.send_text(json.dumps({'type':'error','message':'invalid move'}))

            elif action == 'leave':
                # Handle player leaving
                await handle_player_leave(game_id, user_id)
                break

            else:
                await websocket.send_text(json.dumps({'type':'error','message':'unknown action'}))

    except WebSocketDisconnect:
        # Handle disconnection
        await handle_player_leave(game_id, user_id)


@router.websocket("/ws/matchmaking")
async def matchmaking_websocket(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token")
    user_id = None
    username = None
    is_anonymous = False

    if token:
        user = await get_user_from_token(token)
        if user:
            user_id = str(user.id)
            username = user.username
            is_anonymous = False
        else:
            await websocket.send_text(json.dumps({"type": "error", "message": "Invalid token"}))
            return
    else:
        # Anonymous user
        user_id = f"anon_{id(websocket)}"
        username = f"Guest_{user_id[-4:]}"
        is_anonymous = True

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg["type"] == "join_pool":
                data = msg["data"]
                time_control = data['time_control']

                # For anonymous users, always casual games and fixed rating
                rated = data.get("rated", True) and not is_anonymous
                rating = 1500.0  # Default rating for all anonymous and new users

                if not is_anonymous:
                    # For authenticated users, try to get real rating
                    from uuid import UUID
                    from app.ratings import get_time_control_type as categorize_time
                    category = categorize_time(f"{data['game_type']}_{time_control}")
                    categorized_game_type = f"{data['game_type']}_{category}"
                    game_rating = await RatingCalculator.get_game_rating(UUID(user_id), categorized_game_type)
                    if game_rating:
                        rating = game_rating.rating
                        logger.info(f"User {username} joining pool with rating {rating:.1f} for {categorized_game_type}")
                    else:
                        logger.info(f"User {username} joining pool with default rating {rating} (no game rating found for {categorized_game_type})")

                player = WaitingPlayer(
                    user_id=user_id,
                    username=username,
                    rating=rating,  # Keep as float for precision
                    game_type=data["game_type"],
                    time_control=time_control,
                    rated=rated,
                    is_anonymous=is_anonymous,
                    joined_at=time.time(),
                    ws=websocket
                )
                pool_key = await join_pool(player)
                await websocket.send_text(json.dumps({"type": "in_queue", "pool": pool_key}))
            elif msg["type"] == "leave_pool":
                await leave_pool(user_id)
                await websocket.send_text(json.dumps({"type": "left_queue"}))
    except WebSocketDisconnect:
        await leave_pool(user_id)


# Saved Games API endpoints
saved_game_repo = SavedGameRepository()

@router.get("/saved-games", response_model=List[dict])
async def get_saved_games(current_user = Depends(get_current_user)):
    """Get all saved games for the authenticated user (for stats calculation)."""
    logger.info(f"Getting saved games for user {current_user.id}")
    saved_games = await saved_game_repo.get_by_user_id(current_user.id)
    logger.info(f"Found {len(saved_games)} saved games for user {current_user.id}")

    result = []
    for game in saved_games:
        result.append({
            'id': str(game.id),
            'game_id': game.game_id,
            'game_type': game.game_type,
            'title': game.title,
            'description': game.description,
            'status': game.status,
            'players': game.get_players(),
            'current_player': game.current_player,
            'winner': game.winner,
            'rated': game.rated,
            'created_at': game.created_at.isoformat(),
            'updated_at': game.updated_at.isoformat(),
            'moves_count': len(game.moves) if game.moves else 0,
            'time_control': game.get_time_control()
        })

    return result

@router.get("/saved-games/{game_type}/{category}", response_model=List[dict])
async def get_saved_games_by_category(game_type: str, category: str, current_user = Depends(get_current_user)):
    """Get saved games for the authenticated user by game type and category."""
    from app.ratings import get_time_control_category

    logger.info(f"Getting {game_type} {category} games for user {current_user.id}")

    # Get all user's games
    all_games = await saved_game_repo.get_by_user_id(current_user.id)

    # Filter by game_type and category using ratings logic
    filtered_games = []
    for game in all_games:
        if game.game_type == game_type:
            game_category = get_time_control_category(game_type, game.get_time_control())
            if game_category == category:
                filtered_games.append(game)

    logger.info(f"Found {len(filtered_games)} {game_type} {category} games for user {current_user.id}")

    result = []
    for game in filtered_games:
        result.append({
            'id': str(game.id),
            'game_id': game.game_id,
            'game_type': game.game_type,
            'title': game.title,
            'description': game.description,
            'status': game.status,
            'players': game.get_players(),
            'current_player': game.current_player,
            'winner': game.winner,
            'rated': game.rated,
            'created_at': game.created_at.isoformat(),
            'updated_at': game.updated_at.isoformat(),
            'moves_count': len(game.moves) if game.moves else 0,
            'time_control': game.get_time_control()
        })

    return result

@router.post("/saved-games")
async def save_game(request: dict, current_user = Depends(get_current_user)):
    """Save a game for the authenticated user."""
    game_id = request.get('game_id')
    title = request.get('title', f'Game {datetime.now().strftime("%Y-%m-%d %H:%M")}')

    if not game_id:
        raise HTTPException(status_code=400, detail="game_id is required")

    # Get game state from appropriate engine
    game_state = None
    selected_engine = None

    # Try Tetris engine first
    from app.services.tetris_game_engine import tetris_game_engine
    game_state = tetris_game_engine.get_game_state(game_id)
    if game_state:
        selected_engine = tetris_game_engine
    else:
        # Try general game engine
        from app.services.game_engine import game_engine
        game_state = game_engine.get_game_state(game_id)
        if game_state:
            selected_engine = game_engine

    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")

    # Check if user is a player in this game
    user_is_player = any(player.get('user_id') == str(current_user.id) for player in game_state.players)
    if not user_is_player:
        raise HTTPException(status_code=403, detail="You are not a player in this game")

    # Convert time_remaining dict to proper format
    time_remaining = {}
    for i, time_left in game_state.time_remaining.items():
        time_remaining[i] = float(time_left)

    # Create saved game
    saved_game = await saved_game_repo.create_saved_game(
        user_id=current_user.id,
        game_id=game_id,
        game_type=game_state.game_type,
        title=title,
        game_state=game_state.board_state,
        players=game_state.players,
        current_player=game_state.current_player,
        time_remaining=time_remaining,
        winner=game_state.winner,
        moves_history=[],  # Will be populated from moves_history if available
        time_control={
            'type': game_state.time_control.type,
            'initial_time': game_state.time_control.initial_time,
            'increment': game_state.time_control.increment
        },
        rated=game_state.rated
    )

    # Add moves history if available
    if hasattr(game_state, 'moves_history') and game_state.moves_history:
        move_number = 1
        for move in game_state.moves_history:
            await saved_game_repo.add_game_move(
                saved_game_id=saved_game.id,
                move_number=move_number,
                player_id=move.player_id,
                move_data=move.move_data,
                board_state_after={},  # We'll need to reconstruct this
                timestamp=move.timestamp,
                time_spent=0.0  # Not tracked currently
            )
            move_number += 1

    return {
        'id': str(saved_game.id),
        'message': 'Game saved successfully'
    }

@router.get("/saved-games/{game_id}")
async def get_saved_game(game_id: str, current_user = Depends(get_current_user)):
    """Get a specific saved game with full details."""
    try:
        uuid_game_id = UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")

    saved_game = await saved_game_repo.get_by_id_with_moves(uuid_game_id)
    if not saved_game:
        raise HTTPException(status_code=404, detail="Saved game not found")

    if saved_game.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have access to this saved game")

    # Sort moves by move number
    moves = sorted(saved_game.moves, key=lambda m: m.move_number) if saved_game.moves else []

    return {
        'id': str(saved_game.id),
        'game_id': saved_game.game_id,
        'game_type': saved_game.game_type,
        'title': saved_game.title,
        'description': saved_game.description,
        'status': saved_game.status,
        'board_state': saved_game.get_board_state(),
        'players': saved_game.get_players(),
        'current_player': saved_game.current_player,
        'time_remaining': saved_game.get_time_remaining(),
        'winner': saved_game.winner,
        'moves_history': saved_game.get_moves_history(),
        'time_control': saved_game.get_time_control(),
        'rated': saved_game.rated,
        'created_at': saved_game.created_at.isoformat(),
        'updated_at': saved_game.updated_at.isoformat(),
        'moves': [
            {
                'move_number': move.move_number,
                'player_id': move.player_id,
                'move_data': json.loads(move.move_data) if isinstance(move.move_data, str) else move.move_data,
                'board_state_after': json.loads(move.board_state_after) if isinstance(move.board_state_after, str) else move.board_state_after,
                'timestamp': move.timestamp.isoformat(),
                'time_spent': move.time_spent
            }
            for move in moves
        ]
    }
