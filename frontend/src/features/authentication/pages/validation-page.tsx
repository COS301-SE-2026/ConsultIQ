import React from 'react';
import { NavyBackground } from '../components/Navybackground';
import { RegisterCard } from '../components/validationcard';

export const ValidationForm: React.FC = () => {
  return (
    <div className="w-[1167px] h-[682px] relative bg-[#F4F6FA]">

      <NavyBackground />

     
      <div className="absolute" style={{ top: '64px', right: '0px' }}>
        <RegisterCard />
      </div>

    </div>
  );
};