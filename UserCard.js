import React from 'react';
import './UserCard.css';

function UserCard({ user }) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <span className="user-id">ID: {user.id}</span>
    </div>
  );
}

export default UserCard;