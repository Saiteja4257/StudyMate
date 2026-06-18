import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, googleLogin } from '../services/authService';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLoginWithCredential: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('studymate_token');
    const storedUser = localStorage.getItem('studymate_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (data: any) => {
    const response = await loginUser(data);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('studymate_token', response.token);
    localStorage.setItem('studymate_user', JSON.stringify(response.user));
  };

  const register = async (data: any) => {
    const response = await registerUser(data);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('studymate_token', response.token);
    localStorage.setItem('studymate_user', JSON.stringify(response.user));
  };

  const googleLoginWithCredential = async (credential: string) => {
    const response = await googleLogin(credential);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('studymate_token', response.token);
    localStorage.setItem('studymate_user', JSON.stringify(response.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('studymate_token');
    localStorage.removeItem('studymate_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, register, googleLoginWithCredential, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
