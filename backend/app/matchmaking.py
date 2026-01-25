import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import asyncio
import time

logger = logging.getLogger(__name__)

class JoinData(BaseModel):
    username: str
    rating: int
    game_type: str  # e.g., 'tic-tac-toe'
    time_control: str  # e.g., '3+0', '5+3'
    rated: bool = True

class WaitingPlayer(BaseModel):
    user_id: str
    username: str
    rating: float
    game_type: str
    time_control: str
    rated: bool
    is_anonymous: bool = False
    joined_at: float
    ws: Optional[Any] = None  # WebSocket

    def get_display_rating(self) -> int:
        """Get rating as integer for display purposes."""
        return int(self.rating)

# Pools: pool_key -> list of WaitingPlayer, sorted by rating (then joined_at)
pools: Dict[str, List[WaitingPlayer]] = {}

def make_pool_key(game_type: str, time_control: str, rated: bool) -> str:
    # Use exact time control for pool separation
    return f"{game_type}_{time_control}_{'rated' if rated else 'casual'}"

async def join_pool(player: WaitingPlayer):
    pool_key = make_pool_key(player.game_type, player.time_control, player.rated)
    if pool_key not in pools:
        pools[pool_key] = []
    # Insert sorted by rating, then joined_at
    inserted = False
    for i, p in enumerate(pools[pool_key]):
        if p.rating > player.rating or (p.rating == player.rating and p.joined_at > player.joined_at):
            pools[pool_key].insert(i, player)
            inserted = True
            break
    if not inserted:
        pools[pool_key].append(player)
    logger.info(f"Player {player.username} (id: {player.user_id}, rating {player.rating:.1f}, joined_at: {player.joined_at}) joined pool {pool_key}, total players: {len(pools[pool_key])}")
    # Try to match immediately if we have 2+ players
    await try_match_immediately(pool_key)
    return pool_key

async def leave_pool(user_id: str):
    for pool_key, players in pools.items():
        pools[pool_key] = [p for p in players if p.user_id != user_id]
        if not pools[pool_key]:
            del pools[pool_key]
            break

async def try_match(pool_key: str):
    if pool_key not in pools or len(pools[pool_key]) < 2:
        logger.debug(f"Pool {pool_key} has <2 players or doesn't exist")
        return None
    players = pools[pool_key]
    logger.debug(f"Checking {len(players)} players in {pool_key}")
    # Find closest pair
    min_diff = float('inf')
    pair = None
    for i in range(len(players) - 1):
        diff = abs(players[i].rating - players[i+1].rating)
        logger.debug(f"Pair {i}:{i+1} - {players[i].username}({players[i].rating}) vs {players[i+1].username}({players[i+1].rating}) diff={diff}")
        if diff < min_diff:
            min_diff = diff
            pair = (players[i], players[i+1])
    if pair and min_diff <= 150:  # threshold
        logger.info(f"Matching pair: {pair[0].username} vs {pair[1].username}, diff={min_diff}")
        # Remove them
        pools[pool_key] = [p for p in players if p not in pair]
        logger.debug(f"Players removed from pool, remaining: {len(pools[pool_key])}")
        return pair
    else:
        logger.debug(f"No pair found, min_diff={min_diff} >150")
    return None

async def try_match_immediately(pool_key: str):
    pair = await try_match(pool_key)
    if pair:
        logger.info(f"Match found: {pair[0].username} vs {pair[1].username} in {pool_key}")
        from app.services.game_state import create_matched_game
        await create_matched_game(pair[0].game_type, pair[0].time_control, pair[0], pair[1])
    else:
        logger.debug(f"No match found in {pool_key}, players: {len(pools.get(pool_key, []))}")

# Periodic matchmaking
async def matchmaking_loop():
    while True:
        await asyncio.sleep(1)  # Check every second for faster testing
        for pool_key in list(pools.keys()):
            pair = await try_match(pool_key)
            if pair:
                from app.services.game_state import create_matched_game
                await create_matched_game(pair[0].game_type, pair[0].time_control, pair[0], pair[1])
