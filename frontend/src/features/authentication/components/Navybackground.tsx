import React from 'react';
import dark_theme_logo from '../../../assets/logos/dark_theme_logo.png';

export const NavyBackground: React.FC = () => {
  return (
    <>

      {/* Triangle — top-left corner, cuts diagonally from bottom-left to top-right */}
      <div
        className="absolute inset-0 bg-[#002D62]"
        style={{
          clipPath: 'polygon(0 0, 62% 0, 0 100%)',
        }}
      />

    
     
    </>
  );
};