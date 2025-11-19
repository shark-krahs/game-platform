import React, { useState } from 'react'
import Login from './Login'
import Register from './Register'

export default function AuthSelector() {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => setIsLogin(true)}
          style={{
            padding: '10px',
            marginRight: '10px',
            backgroundColor: isLogin ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Login
        </button>
        <button
          onClick={() => setIsLogin(false)}
          style={{
            padding: '10px',
            backgroundColor: !isLogin ? '#007bff' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Register
        </button>
      </div>
      {isLogin ? <Login /> : <Register />}
    </div>
  )
}
