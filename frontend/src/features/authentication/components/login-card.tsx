import React, { useState } from 'react';
import { toast } from 'sonner';
import { Link } from "react-router-dom";

export const LoginCard: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
 
    const validateForm = () => {
        let valid = true;
    
        // Email validation
        if (!email) {
          toast.error('Email is required');
          valid= false;
        } else if (!/^[\w.-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(email)) {
          toast.error('Invalid email format');
          valid = false;
        }
    
        return valid;
      };

      const handleSubmit = () => {

        if(!validateForm()){
            return;
        }

        //validate password against backend

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
          <label htmlFor= "email" className="text-[#6B7280] text-sm font-bold font-['Calibri'] leading-5">Email</label>
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
          onClick={handleSubmit}
          className="w-full h-12 bg-[#C9A84C] hover:bg-[#b8963e] active:scale-[0.98] rounded-md text-white text-base font-bold font-['Calibri'] leading-6 transition-colors"
        >
          Login
        </button>

      </div>
    </div>
  );
};