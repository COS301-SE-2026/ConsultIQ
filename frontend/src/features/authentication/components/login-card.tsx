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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit();
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
      className="flex flex-col w-[560px] min-h-[580px] bg-white rounded-lg shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] items-center gap-6 pt-12 pb-10"
    >
      {/* Logo placeholder */}
      <div className="flex justify-center mb-8">
        <div className="w-[115px]" />
      </div>

      {/* Header */}
      <div className="mb-8 w-full text-center">
        <h1
          className="font-bold mb-3"
          style={{ color: "var(--color-primary)" }}
        >
          Welcome to ConsultIQ
        </h1>
        <p
          className="text-base"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Sign in to your account to continue.
        </p>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-6">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="email"
            className="text-sm font-bold"
            style={{ color: "var(--color-text-primary)" }}
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
            className="mx-auto w-96 max-w-[520px] h-[50px] px-4 rounded border border-[#E2E8F0] text-base outline-none transition focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="password"
            className="text-sm font-bold"
            style={{ color: "var(--color-text-primary)" }}
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
            className="mx-auto w-96 max-w-[520px] h-[50px] px-4 rounded border border-[#E2E8F0] text-base outline-none transition focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
        </div>

        {/* Forgot password link - centered */}
        <div className="w-96 max-w-[520px] flex justify-center mt-1">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold hover:underline"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Forgot password?
          </Link>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="mx-auto w-96 max-w-[520px] h-[48px] mt-10 rounded text-white font-bold text-base transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Signing in…
          </>
        ) : (
          'Login'
        )}
      </button>
    </form>
  );
};