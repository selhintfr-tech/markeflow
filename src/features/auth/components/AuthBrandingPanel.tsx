import React from 'react';
import { Link } from 'react-router-dom';

export const AuthBrandingPanel: React.FC = () => {
  return (
    <div className="w-full lg:w-[44%] xl:w-[43%] bg-gradient-to-br from-[#621DBA] via-[#5B1EB6] to-[#3B0E8D] min-h-[300px] lg:min-h-screen relative flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden shrink-0 select-none">
      {/* Upper Area: Logo */}
      <div className="relative z-10">
        <Link to="/" className="inline-flex items-center gap-3 group">
          {/* MarketFlow white 3D diamond icon */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="shrink-0 transition-transform group-hover:scale-105"
          >
            <path d="M14 2L25 8.2V20.6L14 26.8L3 20.6V8.2L14 2Z" fill="none" />
            {/* Left facet */}
            <path d="M14 2L3 8.2V20.6L14 14.5V2Z" fill="#FFFFFF" fillOpacity="0.8" />
            {/* Top-Right facet */}
            <path d="M14 2L25 8.2L14 14.5V2Z" fill="#FFFFFF" fillOpacity="0.95" />
            {/* Bottom-Right facet */}
            <path d="M14 14.5L25 8.2V20.6L14 26.8V14.5Z" fill="#FFFFFF" fillOpacity="0.7" />
            {/* Accent fold */}
            <path
              d="M8 11.2L14 7.8L20 11.2L14 14.5L8 11.2Z"
              fill="#FFFFFF"
              fillOpacity="0.35"
            />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-white font-inter">
            MarketFlow
          </span>
        </Link>
      </div>

      {/* Middle Area: Value Proposition */}
      <div className="relative z-10 my-auto py-12 lg:py-0">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.12]">
          Your marketing.<br />
          Clearly managed.
        </h1>
        <p className="mt-4 text-[#E2D9F3] text-sm sm:text-base font-normal leading-relaxed max-w-sm">
          Plan. Execute. Track. Grow.<br />
          All your marketing in one place.
        </p>
      </div>

      {/* Bottom Spacer on desktop */}
      <div className="relative z-10 hidden lg:block h-6" />

      {/* Background Vector Artwork — Abstract geometric curves & polygon */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <svg
          className="absolute -bottom-16 -left-16 w-[140%] h-[80%] max-w-none opacity-90"
          viewBox="0 0 600 600"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Translucent rising trapezoid polygon */}
          <path
            d="M210 650 L450 340 L580 420 L580 650 Z"
            fill="rgba(255, 255, 255, 0.07)"
          />
          <path
            d="M210 650 L450 340 L450 650 Z"
            fill="rgba(255, 255, 255, 0.05)"
          />

          {/* Large circular arcs */}
          <circle
            cx="220"
            cy="520"
            r="340"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
          />
          <circle
            cx="480"
            cy="280"
            r="260"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />

          {/* Diagonal crossing line */}
          <line
            x1="0"
            y1="560"
            x2="520"
            y2="180"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
          />
        </svg>
      </div>
    </div>
  );
};
