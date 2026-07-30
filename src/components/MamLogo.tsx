import React from "react";

interface MamLogoProps {
  className?: string;
  color?: string;
}

export const MamLogo: React.FC<MamLogoProps> = ({ 
  className = "h-8",
  color
}) => {
  return (
    <svg
      viewBox="0 0 270 70"
      fill={color || "currentColor"}
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block aspect-[27/7] select-none ${className}`}
      aria-label="MAM Logo"
    >
      {/* First M (Classic Serif) */}
      <g transform="translate(10, 5)">
        {/* Left vertical stem & serifs (hairline) */}
        <path d="M 5 8 h 24 v 3 h -9 v 42 h 9 v 3 h -24 v -3 h 9 v -42 h -9 z" />
        {/* Main downward diagonal (thick) */}
        <path d="M 17 8 L 46 56 h 6 L 26 8 z" />
        {/* Upward diagonal (thin) */}
        <path d="M 46 56 L 68 8 h 4 L 49 56 z" />
        {/* Right vertical stem & serifs (thick) */}
        <path d="M 59 8 h 24 v 3 h -7 v 42 h 7 v 3 h -24 v -3 h 7 v -42 h -7 z" />
      </g>

      {/* Middle Λ (Modern Minimalist Chevron) */}
      <g transform="translate(108, 5)">
        <polygon points="22,8 28,8 49,56 41,56 25,20 9,56 1,56" />
      </g>

      {/* Second M (Classic Serif) */}
      <g transform="translate(166, 5)">
        {/* Left vertical stem & serifs */}
        <path d="M 5 8 h 24 v 3 h -9 v 42 h 9 v 3 h -24 v -3 h 9 v -42 h -9 z" />
        {/* Main downward diagonal (thick) */}
        <path d="M 17 8 L 46 56 h 6 L 26 8 z" />
        {/* Upward diagonal (thin) */}
        <path d="M 46 56 L 68 8 h 4 L 49 56 z" />
        {/* Right vertical stem & serifs (thick) */}
        <path d="M 59 8 h 24 v 3 h -7 v 42 h 7 v 3 h -24 v -3 h 7 v -42 h -7 z" />
      </g>
    </svg>
  );
};

export default MamLogo;
