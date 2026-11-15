import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../api/client.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest('/auth/me');
      setUser(res.data);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    const token = res?.data?.token || res?.token;
    const userObj = res?.data?.user || res?.user;

    if (!token || !userObj) {
      throw new Error(
        res?.error?.message || 'Login failed: server did not return valid credentials. Please check your backend connection.'
      );
    }

    setStoredToken(token);
    setUser(userObj);
    return userObj;
  };

  const register = async ({ name, email, password, phone }) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password, phone },
    });
    const token = res?.data?.token || res?.token;
    const userObj = res?.data?.user || res?.user;

    if (!token || !userObj) {
      throw new Error(
        res?.error?.message || 'Registration failed: server did not return valid credentials. Please check your backend connection.'
      );
    }

    setStoredToken(token);
    setUser(userObj);
    return userObj;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
