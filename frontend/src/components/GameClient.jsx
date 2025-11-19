import React, { useState, useEffect } from 'react'
import { useAuth } from '../AuthContext'

function Cell({ value, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 80,
        height: 80,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #ccc',
        cursor: value ? 'default' : 'pointer'
      }}
    >
      {value && (
        <svg width="48" height="48">
          <circle cx="24" cy="24" r="18" fill={value} />
        </svg>
      )}
    </div>
  )
}

export default function GameClient() {
  const { user } = useAuth()
  const [ws, setWs] = useState(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const [board, setBoard] = useState([[null, null, null], [null, null, null], [null, null, null]])
  const [players, setPlayers] = useState([])
  const [status, setStatus] = useState('disconnected')
  const [turn, setTurn] = useState(0)
  const [color, setColor] = useState(user?.preferred_color || '#ff0000')
  const [error, setError] = useState(null)
  const [winner, setWinner] = useState(null)

  useEffect(() => {
    return () => {
      if (ws) ws.close()
    }
  }, [ws])

  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const connect = () => {
    const proto = (location.protocol === 'https:') ? 'wss' : 'ws'
    const backendHost = import.meta.env.VITE_BACKEND_HOST || location.hostname
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '8000'
    const wsUrl = `${proto}://${backendHost}:${backendPort}/ws/game/demo`

    const socket = new WebSocket(wsUrl)
    socket.onopen = () => {
      setConnected(true)
      setStatus('connected')
      socket.send(JSON.stringify({ type: 'join', name: user?.username }))
      setMessages(m => [...m, 'connected'])
    }
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'state') {
          setBoard(msg.board)
          setPlayers(msg.players)
          setStatus(msg.status)
          setTurn(msg.turn)
          setError(null)
          setWinner(msg.winner || null)
        } else if (msg.type === 'error') {
          setError(msg.message)
          setMessages(m => [...m, 'error: ' + msg.message])
        }
      } catch (e) {
        setMessages(m => [...m, ev.data])
      }
    }
    socket.onclose = () => {
      setConnected(false)
      setStatus('disconnected')
      setMessages(m => [...m, 'closed'])
    }
    setWs(socket)
  }

  const chooseColor = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) { setError('not connected'); return }
    ws.send(JSON.stringify({ type: 'choose_color', color }))
  }

  const handleCell = (x, y) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) { setError('not connected'); return }
    ws.send(JSON.stringify({ type: 'move', x, y }))
  }

  const resetGame = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) { setError('not connected'); return }
    ws.send(JSON.stringify({ type: 'reset' }))
  }

  // Определяем "себя" и "оппонента"
  const me = players.find(p => p.name === user?.username)
  const opponent = players.find(p => p.name !== user?.username)

  const renderPlayerTimer = (p, isMe) => {
    if (!p) return null
    return (
      <div
        style={{
          padding: '10px',
          marginBottom: '10px',
          border: '1px solid #ccc',
          borderRadius: '6px',
          backgroundColor: turn === players.indexOf(p) ? '#f0f8ff' : '#fff'
        }}
      >
        <div><b>{p.name}</b></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: p.color || '#ccc'
            }}
          />
          <span>{formatTime(p.remaining || 0)}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={connect}>Connect & Join Room</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'inline-block', marginRight: 8 }}>Choose your circle color:</div>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <button onClick={chooseColor} style={{ marginLeft: 8 }}>Choose Color</button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Левая колонка: таймеры */}
        <div style={{ width: 200 }}>
          <h3>Timers</h3>
          {renderPlayerTimer(opponent, false)}
          {renderPlayerTimer(me, true)}
        </div>

        {/* Правая колонка: доска и статус */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,80px)' }}>
            {board.map((row, y) => row.map((cell, x) => (
              <Cell
                key={`${x}-${y}`}
                value={cell}
                onClick={() => { if (!cell && status === 'playing') handleCell(x, y) }}
              />
            )))}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={resetGame}>Reset</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <b>Status:</b> {status}
          </div>
          {status === 'finished' && (
            <div><b>Result:</b> {winner ? `Winner: ${winner}` : 'Draw'}</div>
          )}
          <div><b>Turn:</b> {status === 'playing' ? `Player ${turn + 1}` : '-'}</div>
          {error && <div style={{ color: 'red' }}>Error: {error}</div>}
          <div style={{ marginTop: 12 }}>
            <b>Messages</b>
            <div style={{ whiteSpace: 'pre-wrap' }}>{messages.join('\n')}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
