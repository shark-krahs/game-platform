import React, { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error } = useAuth()

  const handleSubmit = (e) => {
    e.preventDefault()
    login(username, password)
  }

  return (
    <div style={{ maxWidth: '300px', margin: '50px auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '8px' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
      </form>
    </div>
  )
}
