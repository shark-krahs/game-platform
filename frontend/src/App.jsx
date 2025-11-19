import React, { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import AuthSelector from './components/AuthSelector'
import GameClient from './components/GameClient'
import Profile from './components/Profile'


function AppContent() {
  const { user, logout } = useAuth()
  const [view, setView] = useState('game')

  return (
    <div style={{padding:20}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <h1>TG Game Bot — Demo</h1>
        {user && (
          <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <span>Welcome, {user.username}</span>
            <button onClick={() => setView(view === 'game' ? 'profile' : 'game')} style={{padding: '5px 10px'}}>
              {view === 'game' ? 'Profile' : 'Game'}
            </button>
            <button onClick={logout} style={{padding: '5px 10px'}}>Logout</button>
          </div>
        )}
      </div>
      {user ? (view === 'game' ? <GameClient /> : <Profile />) : <AuthSelector />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
