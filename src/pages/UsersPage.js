import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import './UsersPage.css';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    apiService.getUsers()
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => { setError('Could not connect to backend'); setLoading(false); });
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      const user = await apiService.createUser({ name: newName, email: newEmail });
      setUsers(prev => [...prev, user]);
      setNewName('');
      setNewEmail('');
    } catch {
      setError('Failed to create user');
    }
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h2 className="users-title">Team</h2>
        <span className="users-count">{users.length} members</span>
      </div>

      <form className="add-user-form" onSubmit={handleAdd}>
        <input
          className="user-input"
          placeholder="Name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <input
          className="user-input"
          placeholder="Email"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
        />
        <button className="btn-add-user" type="submit">Add Member</button>
      </form>

      {error && <div className="users-error">{error}</div>}

      {loading ? (
        <div className="users-loading">Loading...</div>
      ) : (
        <div className="users-grid">
          {users.map(user => (
            <div key={user.id} className="user-card">
              <div className="user-avatar">
                {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UsersPage;