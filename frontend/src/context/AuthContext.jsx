import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionId, setSessionId] = useState(localStorage.getItem('session_id') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      axios.get(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: { Authorization: sessionId }
      })
      .then(res => setUser(res.data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const login = async (username, password) => {
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, { username, password });
    const { session_id, user } = res.data;
    localStorage.setItem('session_id', session_id);
    setSessionId(session_id);
    setUser(user);
  };

  const logout = async () => {
    if (sessionId) {
      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, {
          headers: { Authorization: sessionId }
        });
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.removeItem('session_id');
    setSessionId('');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};