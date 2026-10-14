import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = 'h-8 w-auto' }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* MarketFlow geometric purple 3D cube / diamond prism icon */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M14 2L25 8.2V20.6L14 26.8L3 20.6V8.2L14 2Z"
          fill="none"
        />
        {/* Left facet */}
        <path
          d="M14 2L3 8.2V20.6L14 14.5V2Z"
          fill="#4F46E5"
        />
        {/* Top-Right facet */}
        <path
          d="M14 2L25 8.2L14 14.5V2Z"
          fill="#7C3AED"
        />
        {/* Bottom-Right facet */}
        <path
          d="M14 14.5L25 8.2V20.6L14 26.8V14.5Z"
          fill="#6D28D9"
        />
        {/* Dynamic accent fold */}
        <path
          d="M8 11.2L14 7.8L20 11.2L14 14.5L8 11.2Z"
          fill="#A78BFA"
          fillOpacity="0.85"
        />
      </svg>
      <span className="text-[20px] font-bold tracking-tight text-[#1E1B4B]">
        Market<span className="text-[#6D28D9]">Flow</span>
      </span>
    </div>
  );
};
