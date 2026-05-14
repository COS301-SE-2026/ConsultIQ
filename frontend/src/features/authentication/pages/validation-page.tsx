import React from 'react';
import { NavyBackground } from '../components/Navybackground';
import { RegisterCard } from '../components/validationcard';

export const ValidationForm: React.FC = () => {
  return (
    <div className="w-[1167px] h-[682px] relative bg-[#F4F6FA]">

      <NavyBackground />

      {/* Card positioned using Figma outer spacing: 64px from top, 135px from right */}
      <div className="absolute" style={{ top: '64px', right: '0px' }}>
        <RegisterCard />
      </div>

    </div>
  );
};