import React, { useState } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { ApiError } from '../services/auth.service';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
function validate(email: string, password: string): string | null {
  if (!email) return 'Email is required.';
  if (!/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(email))
    return 'Invalid email format.';
  if (!password) return 'Password is required.';
  return null;
}

// ---------------------------------------------------------------------------
// Friendly error messages for known HTTP status codes
// ---------------------------------------------------------------------------
function friendlyError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 401:
        return 'Incorrect email or password.';
      case 403:
        return 'Your account is not yet activated. Check your inbox.';
      case 429:
        return 'Too many login attempts. Please wait a minute and try again.';
      case 500:
        return 'Something went wrong on our end. Please try again shortly.';
      default:
        return err.message;
    }
  }
  // Network failure / fetch threw
  return 'Unable to reach the server. Check your connection.';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const LoginCard: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    // Client-side validation before hitting the API
    const validationError = validate(email, password);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const targetRoute = await login({ email, password });

      toast.success('Login successful');
      navigate(targetRoute || '/dashboard');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // Allow submitting with the Enter key from either field
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit();
  };

  return (
    <div className="relative" style={{ overflow: 'visible' }}>
      {/* Gold ambient glow */}
      <div
        className="absolute pointer-events-none bg-[#C9A84C]/25 blur-[80px] rounded-full"
        style={{ inset: '-80px' }}
      />

      {/* Card */}
      <div
        className="relative w-[448px] bg-white rounded-lg shadow-lg outline outline-[0.80px] outline-offset-[-0.80px] outline-[#E2E8F0] flex flex-col items-stretch gap-8"
        style={{ padding: '32.8px' }}
      >
        {/* Title */}
        <div className="text-center text-[#002D62] text-2xl font-bold font-['Calibri'] leading-8">
          Welcome to ConsultIQ
        </div>

        {/* Email */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="h-12 px-4 bg-white rounded-sm outline outline-[0.80px] outline-[#E2E8F0] text-[#6B7280] text-base font-['Calibri'] focus:outline-[#C9A84C] focus:outline-2 w-full disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="h-12 px-4 bg-white rounded-sm outline outline-[0.80px] outline-[#E2E8F0] text-[#6B7280] text-base font-['Calibri'] focus:outline-[#C9A84C] focus:outline-2 w-full disabled:opacity-50"
          />
        </div>

        {/* Forgot Password */}
        <div className="flex flex-col gap-2">
          <Link
            to="/forgot-password"
            className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Login Button */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={loading}
          className="w-full h-12 bg-[#C9A84C] hover:bg-[#b8963e] active:scale-[0.98] rounded-md text-white text-base font-bold font-['Calibri'] leading-6 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              {/* Inline spinner — no extra dependency needed */}
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
              Signing in…
            </>
          ) : (
            'Login'
          )}
        </button>
      </div>
    </div>
  );
};