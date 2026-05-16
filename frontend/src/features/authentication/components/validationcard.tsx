import React, { useState } from 'react';
import { toast } from 'sonner';

export const ValidationCard: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateForm = () => {
    let valid = true;

     const trimmedEmail = email.trim();

    // Email validation
    if (!trimmedEmail && email.length === 0) {
      toast.error('Email is required');
      valid = false;
    } else if (!trimmedEmail || !/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      toast.error('Invalid email format');
      valid = false;
    }

    // Password validation
    if (!password) {
      toast.error('Password is required');
      valid = false;
    } else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,}$/.test(password)) {
      toast.error('Password must be 8 characters long containing at least one uppercase letter, one digit, and one special character');
      valid = false;
    }

    // Confirm password validation
    if (confirmPassword !== password) {
      toast.error('Passwords do not match');
      valid = false
    }

    return valid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      toast.success('Form submitted successfully!');
      // API call
    }
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
          <label htmlFor="email" className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5">Email</label>
          <input
            id= "email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 px-4 bg-white rounded-sm outline outline-[0.80px] outline-[#E2E8F0] text-[#6B7280] text-base font-['Calibri'] focus:outline-[#C9A84C] focus:outline-2 w-full"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 px-4 bg-white rounded-sm outline outline-[0.80px] outline-[#E2E8F0] text-[#6B7280] text-base font-['Calibri'] focus:outline-[#C9A84C] focus:outline-2 w-full"
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-2">
          <label htmlFor="confirmPassword" className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 px-4 bg-white rounded-sm outline outline-[0.80px] outline-[#E2E8F0] text-[#6B7280] text-base font-['Calibri'] focus:outline-[#C9A84C] focus:outline-2 w-full"
          />
        </div>

        {/* Register Button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-12 bg-[#C9A84C] hover:bg-[#b8963e] active:scale-[0.98] rounded-md text-white text-base font-bold font-['Calibri'] leading-6 transition-colors"
        >
          Register
        </button>

      </div>
    </div>
  );
};