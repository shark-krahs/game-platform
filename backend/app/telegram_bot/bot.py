import os
import logging
from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor

logger = logging.getLogger(__name__)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

if not TOKEN:
    # Для dev можно поставить переменную в .env
    logger.warning("TELEGRAM_BOT_TOKEN not set")

bot = Bot(token=TOKEN)
dp = Dispatcher()


@dp.message_handler(commands=["start"])
async def cmd_start(message: types.Message):
    await message.reply("Привет! Я игровой бот. Здесь будут доступны покупки за звёзды.")


if __name__ == "__main__":
    executor.start_polling(dp, skip_updates=True)
