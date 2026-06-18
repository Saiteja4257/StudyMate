import API from './api';

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
}) => {
  const response = await API.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (userData: {
  email: string;
  password: string;
}) => {
  const response = await API.post('/auth/login', userData);
  return response.data;
};

export const getProfile = async () => {
  const response = await API.get('/auth/profile');
  return response.data;
};

export const googleLogin = async (credential: string) => {
  const response = await API.post('/auth/google', { credential });
  return response.data;
};