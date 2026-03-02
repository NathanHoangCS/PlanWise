import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

function HomePage() {
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Test backend connection
    apiService.getHealth()
      .then(data => setStatus(data.status))
      .catch(err => setStatus('Error connecting to backend'));
  }, []);

  return (
    <div className="home-page">
      <h2>Welcome to Your Full Stack App</h2>
      <p>Backend Status: {status || 'Loading...'}</p>
      <div>
        <a href="/users">View Users</a>
      </div>
    </div>
  );
}

export default HomePage;