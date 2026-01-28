import glicko2
import logging
from typing import Tuple, Optional
from datetime import datetime
from uuid import UUID
from app.repositories.game_rating_repository import GameRatingRepository
from app.db.models import GameRating

logger = logging.getLogger(__name__)

# Repository instance
rating_repo = GameRatingRepository()

def get_time_control_type(time_control_str: str) -> str:
    """Categorize time control into bullet/blitz/rapid/classical based on total time"""
    try:
        # Extract time part from strings like "tetris_30+0" or "0+30"
        parts = time_control_str.split('+')
        if len(parts) >= 2:
            time_part = parts[0].split('_')[-1]  # Get the last part after '_'
            total_seconds = int(parts[-1])

            if time_control_str.__contains__('tetris'):
                if total_seconds < 6:
                    return 'bullet'
                elif total_seconds < 9:
                    return 'blitz'
                elif total_seconds < 12:
                    return 'rapid'
                else:
                    return 'classical'
            else:
                total_seconds = int(time_part) * 60
                if total_seconds < 180:
                    return 'bullet'
                elif total_seconds < 420:
                    return 'blitz'
                elif total_seconds < 1200:
                    return 'rapid'
                else:
                    return 'classical'
    except:
        pass
    return 'blitz'  # default

def get_time_control_category(game_type: str, time_control: dict) -> str:
    """Categorize time control into bullet/blitz/rapid/classical based on time_control object"""
    try:
        initial = time_control.get('initial_time', time_control.get('initial', 0))
        logger.info(f"time_control category: {time_control}")
        increment = time_control.get('increment', 0)

        if game_type == 'tetris':
            # For tetris, only increment matters
            if increment < 6:
                return 'bullet'
            elif increment < 9:
                return 'blitz'
            elif increment < 12:
                return 'rapid'
            else:
                return 'classical'
        else:
            # For other games (pentago), use initial time
            if initial < 180:
                return 'bullet'
            elif initial < 420:
                return 'blitz'
            elif initial < 1200:
                return 'rapid'
            else:
                return 'classical'
    except:
        pass
    return 'blitz'  # default

class RatingCalculator:
    @staticmethod
    def calculate_new_ratings(p1_rating: float, p1_rd: float, p1_vol: float,
                            p2_rating: float, p2_rd: float, p2_vol: float, winner: int) -> Tuple[float, float, float, float, float, float]:
        """
        Calculate new Glicko2 ratings after a game.
        winner: 1 if player1 won, 2 if player2 won, 0 if draw
        """
        p1 = glicko2.Player(rating=p1_rating, rd=p1_rd, vol=p1_vol)
        p2 = glicko2.Player(rating=p2_rating, rd=p2_rd, vol=p2_vol)

        # Update ratings using the correct glicko2 API
        if winner == 1:
            # p1 won against p2
            p1.update_player([p2_rating], [p2_rd], [1])
            p2.update_player([p1_rating], [p1_rd], [0])
        elif winner == 2:
            # p2 won against p1
            p1.update_player([p2_rating], [p2_rd], [0])
            p2.update_player([p1_rating], [p1_rd], [1])
        else:
            # draw
            p1.update_player([p2_rating], [p2_rd], [0.5])
            p2.update_player([p1_rating], [p1_rd], [0.5])

        return (p1.rating, p1.rd, p1.vol, p2.rating, p2.rd, p2.vol)

    @staticmethod
    async def get_or_create_game_rating(user_id: UUID, game_type: str) -> GameRating:
        """Get existing game rating or create new one with defaults."""
        return await rating_repo.get_or_create_rating(user_id, game_type)

    @staticmethod
    async def update_ratings_after_game(game_type: str, time_control_str: str, player1_id: UUID, player2_id: UUID, winner: int):
        """Update player ratings in specific game category after a rated game."""
        category = get_time_control_type(f"{game_type}_{time_control_str}")
        categorized_game_type = f"{game_type}_{category}"

        # Get or create ratings (using categorized game type)
        p1_rating = await RatingCalculator.get_or_create_game_rating(player1_id, categorized_game_type)
        p2_rating = await RatingCalculator.get_or_create_game_rating(player2_id, categorized_game_type)

        # Calculate new ratings
        new_ratings = RatingCalculator.calculate_new_ratings(
            p1_rating.rating, p1_rating.rd, p1_rating.volatility,
            p2_rating.rating, p2_rating.rd, p2_rating.volatility,
            winner
        )

        # Update ratings
        p1_rating.rating, p1_rating.rd, p1_rating.volatility, p2_rating.rating, p2_rating.rd, p2_rating.volatility = new_ratings

        # Save updated ratings
        await rating_repo.update_rating_after_game(p1_rating)
        await rating_repo.update_rating_after_game(p2_rating)

    @staticmethod
    async def update_ratings_after_bot_game(
        game_type: str,
        time_control_str: str,
        player_id: UUID,
        winner: int,
    ):
        """Update ratings for a player in a rated game against a bot (mirror rating)."""
        category = get_time_control_type(f"{game_type}_{time_control_str}")
        categorized_game_type = f"{game_type}_{category}"

        player_rating = await RatingCalculator.get_or_create_game_rating(player_id, categorized_game_type)

        mirrored_rating = RatingCalculator.calculate_new_ratings(
            player_rating.rating,
            player_rating.rd,
            player_rating.volatility,
            player_rating.rating,
            player_rating.rd,
            player_rating.volatility,
            winner,
        )

        player_rating.rating = mirrored_rating[0]
        player_rating.rd = mirrored_rating[1]
        player_rating.volatility = mirrored_rating[2]

        await rating_repo.update_rating_after_game(player_rating)

    @staticmethod
    async def get_game_rating(user_id: UUID, game_type: str) -> Optional[GameRating]:
        """Get game rating for user, returns None if not found."""
        return await rating_repo.get_game_rating(user_id, game_type)
