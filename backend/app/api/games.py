from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import json
import asyncio
import random
import time
from typing import Dict, Any

router = APIRouter()

TOTAL_TIME = 10 * 60  # 10 минут
INCREMENT = 10        # +10 секунд за ход

games: Dict[str, Dict[str, Any]] = {}

def _new_board():
    return [[None for _ in range(3)] for __ in range(3)]

def check_winner(board):
    lines = []
    for i in range(3):
        lines.append([board[i][0], board[i][1], board[i][2]])
        lines.append([board[0][i], board[1][i], board[2][i]])
    lines.append([board[0][0], board[1][1], board[2][2]])
    lines.append([board[0][2], board[1][1], board[2][0]])
    for line in lines:
        if line[0] is not None and line[0] == line[1] == line[2]:
            return line[0]
    for r in board:
        for c in r:
            if c is None:
                return None
    return 'draw'

async def broadcast_state(game_id: str):
    g = games.get(game_id)
    if not g:
        return
    state = {
        'type': 'state',
        'board': g['board'],
        'players': [
            {
                'id': p['id'],
                'name': p.get('name'),
                'color': p.get('color'),
                # округляем только при отправке клиенту
                'remaining': int(p.get('remaining', 0))
            } for p in g['players']
        ],
        'status': g['status'],
        'turn': g['turn'],
    }
    if g['status'] == 'finished':
        state['winner'] = g.get('winner')
    for p in list(g['players']):
        try:
            await p['ws'].send_text(json.dumps(state))
        except Exception:
            pass


async def tick_timer(game_id: str):
    while game_id in games:
        g = games[game_id]
        async with g['lock']:
            if g['status'] == 'playing' and g['players']:
                now = time.time()
                elapsed = now - g.get('last_tick_ts', now)
                g['last_tick_ts'] = now
                # уменьшаем время на реальное прошедшее значение (float)
                g['players'][g['turn']]['remaining'] -= elapsed
                if g['players'][g['turn']]['remaining'] <= 0:
                    g['status'] = 'finished'
                    loser_idx = g['turn']
                    winner_idx = 1 - loser_idx
                    g['winner'] = g['players'][winner_idx]['name']
            await broadcast_state(game_id)
        await asyncio.sleep(1)

@router.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await websocket.accept()
    player_id = str(id(websocket))

    if game_id not in games:
        games[game_id] = {
            'players': [],
            'board': _new_board(),
            'turn': 0,
            'status': 'waiting',
            'lock': asyncio.Lock(),
            'winner': None,
            'last_tick_ts': time.time(),
        }
        asyncio.create_task(tick_timer(game_id))

    g = games[game_id]

    try:
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                await websocket.send_text(json.dumps({'type':'error','message':'invalid json'}))
                continue

            action = msg.get('type')
            async with g['lock']:
                if action == 'join':
                    name = msg.get('name') or f'Player-{len(g["players"])+1}'
                    if len(g['players']) >= 2:
                        await websocket.send_text(json.dumps({'type':'error','message':'room full'}))
                        continue
                    g['players'].append({
                        'ws': websocket,
                        'id': player_id,
                        'name': name,
                        'color': None,
                        'remaining': TOTAL_TIME
                    })
                    await broadcast_state(game_id)

                elif action == 'choose_color':
                    color = msg.get('color')
                    if not color:
                        await websocket.send_text(json.dumps({'type':'error','message':'no color provided'}))
                        continue
                    player = next((p for p in g['players'] if p['id'] == player_id), None)
                    if not player:
                        await websocket.send_text(json.dumps({'type':'error','message':'you must join first'}))
                        continue
                    other = next((p for p in g['players'] if p['id'] != player_id), None)
                    if other and other.get('color') == color:
                        await websocket.send_text(json.dumps({'type':'error','message':'color already taken'}))
                        continue
                    player['color'] = color
                    if len(g['players']) == 2 and all(p.get('color') for p in g['players']):
                        g['status'] = 'playing'
                        g['turn'] = random.choice([0,1])
                        g['last_tick_ts'] = time.time()
                    await broadcast_state(game_id)

                elif action == 'move':
                    if g['status'] != 'playing':
                        await websocket.send_text(json.dumps({'type':'error','message':'game not in playing state'}))
                        continue
                    player_idx = next((i for i,p in enumerate(g['players']) if p['id']==player_id), None)
                    if player_idx is None:
                        await websocket.send_text(json.dumps({'type':'error','message':'you must join first'}))
                        continue
                    if player_idx != g['turn']:
                        await websocket.send_text(json.dumps({'type':'error','message':'not your turn'}))
                        continue
                    x = msg.get('x')
                    y = msg.get('y')
                    if x is None or y is None or not (0 <= x < 3) or not (0 <= y < 3):
                        await websocket.send_text(json.dumps({'type':'error','message':'invalid coordinates'}))
                        continue
                    if g['board'][y][x] is not None:
                        await websocket.send_text(json.dumps({'type':'error','message':'cell occupied'}))
                        continue
                    color = g['players'][player_idx].get('color')
                    g['board'][y][x] = color
                    g['players'][player_idx]['remaining'] += INCREMENT
                    res = check_winner(g['board'])
                    if res == 'draw':
                        g['status'] = 'finished'
                        g['winner'] = None
                    elif res is not None:
                        g['status'] = 'finished'
                        g['winner'] = res
                    else:
                        g['turn'] = 1 - g['turn']
                        g['last_tick_ts'] = time.time()
                    await broadcast_state(game_id)

                elif action == 'reset':
                    player = next((p for p in g['players'] if p['id'] == player_id), None)
                    if player:
                        g['board'] = _new_board()
                        g['status'] = 'waiting'
                        g['winner'] = None
                        for p in g['players']:
                            p['color'] = None
                            p['remaining'] = TOTAL_TIME
                        await broadcast_state(game_id)

                else:
                    await websocket.send_text(json.dumps({'type':'error','message':'unknown action'}))

    except WebSocketDisconnect:
        async with g['lock']:
            g['players'] = [p for p in g['players'] if p['id'] != player_id]
            if not g['players']:
                del games[game_id]
            else:
                g['status'] = 'waiting'
                g['board'] = _new_board()
                g['winner'] = None
                for p in g['players']:
                    p['color'] = None
                await broadcast_state(game_id)