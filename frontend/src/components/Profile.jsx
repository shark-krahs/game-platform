import React, { useState } from 'react'
import { useAuth } from '../AuthContext'

export default function Profile() {
  const { user, updateProfile, error, loading } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [preferredColor, setPreferredColor] = useState(user?.preferred_color || '#ff0000')
  const [localError, setLocalError] = useState('')

  const handleSave = async () => {
    setLocalError('')
    if (newPassword && newPassword !== confirmPassword) {
      setLocalError('New passwords do not match')
      return
    }
    if (newPassword && !oldPassword) {
      setLocalError('Old password is required to change password')
      return
    }
    try {
      const updates = { preferred_color: preferredColor }
      if (newPassword) {
        updates.old_password = oldPassword
        updates.new_password = newPassword
      }
      await updateProfile(updates)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      alert('Profile updated successfully')
    } catch (err) {
      setLocalError(err.message || 'Update failed')
    }
  }

  return (
    <div>
      <h2>User Profile</h2>
      <div style={{ marginBottom: 20 }}>
        <div><b>Username:</b> {user.username}</div>
        <div><b>Stars:</b> {user.stars}</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Change Password</h3>
        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={e => setOldPassword(e.target.value)}
          style={{ marginBottom: 10, display: 'block' }}
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          style={{ marginBottom: 10, display: 'block' }}
        />
        <input
          type="password"
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          style={{ marginBottom: 10, display: 'block' }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3>Preferred Color</h3>
        <input
          type="color"
          value={preferredColor}
          onChange={e => setPreferredColor(e.target.value)}
          style={{ marginBottom: 10 }}
        />
      </div>

      {(localError || error) && <div style={{ color: 'red' }}>{localError || error}</div>}

      <button onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}
