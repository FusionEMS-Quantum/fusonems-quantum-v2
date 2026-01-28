import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initAuth, getUserInfo } from '../lib/auth';
import { useFireMDTStore } from '../lib/store';

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useFireMDTStore((state) => state.setAuth);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const authenticated = await initAuth();
      if (authenticated) {
        const userInfo = getUserInfo();
        setAuth(userInfo, ''); // Token is managed by Keycloak
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <h1 className="text-3xl font-bold mb-2">Fire MDT</h1>
          <p className="text-gray-400 mb-8">Mobile Data Terminal</p>
          
          <button
            onClick={handleLogin}
            disabled={loading}
            className="login-button"
          >
            {loading ? 'Logging in...' : 'Login with Keycloak'}
          </button>
        </div>
      </div>
    </div>
  );
};
