import React, { createContext, useContext, useState, useEffect } from 'react';
import * as authApi from '../api/auth.api';

export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const isAuthenticated = Boolean(user || localStorage.getItem('token'));

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch (err) {
      // ignore parse errors
    }
  }, []);

  const login = async (username, password) => {
    setError('');
    const res = await authApi.login({ username, password });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    try {
      localStorage.setItem('user', JSON.stringify(u));
    } catch (err) {
      // ignore storage errors
    }
    setUser(u);
    return res.data;
  };

  const register = async (email, password, firstName, lastName) => {
    setError('');
    const res = await authApi.register({ email, password, firstName, lastName });
    const { token, user: u } = res.data;
    localStorage.setItem('token', token);
    try {
      localStorage.setItem('user', JSON.stringify(u));
    } catch (err) {
      // ignore storage errors
    }
    setUser(u);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    try {
      localStorage.removeItem('user');
    } catch (err) {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, error, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
