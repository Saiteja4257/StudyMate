import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, MailCheck, RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../services/authService';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [code, setCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, verifyEmailAndLogin, googleLoginWithCredential } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setUnverifiedEmail('');

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
      const result = await register({ name, email, password });
      if (result?.requiresVerification) {
        setVerificationEmail(result.email || email.trim());
        setStatusMessage(
          result.message || 'We sent a 6-digit verification code to your email.'
        );
        setCooldown(60);
        setStep('verify');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
      if (err.response?.data?.requiresVerification) {
        setUnverifiedEmail(err.response.data.email || email.trim());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    const trimmedCode = code.trim();
    if (!/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailAndLogin({
        email: verificationEmail || email.trim(),
        code: trimmedCode,
      });
      navigate('/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    const targetEmail = verificationEmail || email.trim();
    if (!targetEmail) return;

    setError('');
    setStatusMessage('');
    setIsResending(true);
    try {
      const res = await resendVerification(targetEmail);
      setStatusMessage(res.message || 'A new verification code has been sent.');
      setCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setIsSubmitting(true);
      setError('');
      if (credentialResponse.credential) {
        await googleLoginWithCredential(credentialResponse.credential);
        navigate('/home');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign up with Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Verification step (inline after successful registration) ──
  if (step === 'verify') {
    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />

        <div className="z-10 w-full max-w-md p-8 glass-strong animate-slide-up mx-4">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-primary w-8 h-8" />
              <h1 className="text-3xl font-bold gradient-text">Verify Email</h1>
            </div>
            <p className="text-gray-400 text-sm">
              Enter the 6-digit code sent to {verificationEmail || email}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              <p>{error}</p>
            </div>
          )}

          {statusMessage && (
            <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm text-center">
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                className="input-field text-center tracking-[0.4em] font-mono text-lg"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary mt-2 py-3 flex justify-center items-center gap-2 h-12"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <MailCheck className="w-5 h-5" />
                  <span>Verify &amp; Create Account</span>
                </>
              )}
            </button>

            <div className="mt-2 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                  setStatusMessage('');
                }}
                className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={isResending || cooldown > 0}
                className="text-primary hover:text-primary-light disabled:text-gray-500 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                {cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : isResending
                    ? 'Sending...'
                    : 'Resend code'}
              </button>
            </div>
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
  }

  // ── Registration form step ──
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />

      <div className="z-10 w-full max-w-md p-8 glass-strong animate-slide-up mx-4">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-primary w-8 h-8" />
            <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
          </div>
          <p className="text-gray-400 text-sm">Join StudyMate AI today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            <p>{error}</p>
            {unverifiedEmail && (
              <button
                type="button"
                onClick={() => {
                  setVerificationEmail(unverifiedEmail);
                  setError('');
                  setStep('verify');
                }}
                className="mt-2 text-primary hover:underline font-medium"
              >
                Verify email now →
              </button>
            )}
          </div>
        )}

        {statusMessage && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm text-center">
            {statusMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Full Name"
              className="input-field pl-12"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="relative">
            <input
              type="email"
              placeholder="Email address"
              className="input-field pl-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              className="input-field pl-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="relative">
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
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-700" />
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">Or continue with</span>
            <div className="flex-grow border-t border-gray-700" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google Signup Failed')}
              theme="filled_black"
              shape="pill"
              text="signup_with"
            />
          </div>
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
