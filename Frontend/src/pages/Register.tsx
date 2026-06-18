import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name, email, password });
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>

      <div className="z-10 w-full max-w-md p-8 glass-strong animate-slide-up mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-primary w-8 h-8" />
            <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
          </div>
          <p className="text-gray-400">Join StudyMate AI today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            {/* <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" /> */}
            <input
              type="text"
              placeholder="Full Name"
              className="input-field pl-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="relative">
            {/* <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-8 h-8" /> */}
            <input
              type="email"
              placeholder="Email address"
              className="input-field pl-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            {/* <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-8 h-8" /> */}
            <input
              type="password"
              placeholder="Password"
              className="input-field pl-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="relative">
            {/* <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-8 h-8" /> */}
            <input
              type="password"
              placeholder="Confirm Password"
              className="input-field pl-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary mt-4 py-3 flex justify-center items-center h-12"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400">
          Already have an account?{' '}
          <Link to="/" className="text-primary hover:text-primary-light transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;