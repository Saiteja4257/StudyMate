import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, RefreshCw, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resendVerification } from '../services/authService';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmailAndLogin } = useAuth();

  const tokenFromUrl = searchParams.get('token');
  const state = (location.state as { email?: string; justRegistered?: boolean } | null) || {};
  const initialEmail = state.email || searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    state.justRegistered
      ? 'We sent a 6-digit verification code and link to your email.'
      : ''
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const tokenAttemptedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!tokenFromUrl || tokenAttemptedRef.current) return;
    tokenAttemptedRef.current = true;

    const verifyViaLink = async () => {
      setIsVerifying(true);
      setError('');
      try {
        await verifyEmailAndLogin({ token: tokenFromUrl });
        setVerified(true);
        setStatusMessage('Email verified! Redirecting to your workspace...');
        setTimeout(() => navigate('/home', { replace: true }), 1200);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            'Invalid or expired verification link. Enter your code or request a new email.'
        );
      } finally {
        setIsVerifying(false);
      }
    };

    verifyViaLink();
  }, [tokenFromUrl, verifyEmailAndLogin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    const trimmedEmail = email.trim();
    const trimmedCode = code.trim();

    if (!trimmedEmail || !/^\d{6}$/.test(trimmedCode)) {
      setError('Please enter your email address and the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailAndLogin({ email: trimmedEmail, code: trimmedCode });
      setVerified(true);
      setStatusMessage('Email verified! Redirecting to your workspace...');
      setTimeout(() => navigate('/home', { replace: true }), 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setStatusMessage('');

    if (!email.trim()) {
      setError('Please enter your email address first so we know where to send the code.');
      return;
    }

    setIsResending(true);
    try {
      const res = await resendVerification(email.trim());
      setStatusMessage(res.message || 'Verification email sent! Please check your inbox.');
      setCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-dark">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px]"></div>

      <div className="z-10 w-full max-w-md p-8 glass-strong animate-fade-in mx-4">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-primary w-8 h-8" />
            <h1 className="text-2xl font-bold gradient-text">Verify Your Email</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Confirm your email address to activate your StudyMate AI account.
          </p>
        </div>

        {verified ? (
          <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20 text-center flex flex-col items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
            <p className="text-green-300 font-medium">{statusMessage}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {statusMessage && (
              <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm text-center">
                {statusMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isVerifying}
                />
              </div>

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
                  disabled={isVerifying}
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="btn-primary mt-2 py-3 flex justify-center items-center gap-2 h-12"
              >
                {isVerifying ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <MailCheck className="w-5 h-5" />
                    <span>Verify Email</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
                className="text-sm text-primary hover:text-primary-light disabled:text-gray-500 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isResending ? 'animate-spin' : ''}`} />
                {cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : isResending
                    ? 'Sending...'
                    : 'Resend verification email'}
              </button>

              <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
