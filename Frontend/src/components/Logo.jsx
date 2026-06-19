import React from 'react';

/**
 * Reusable premium SVG Logo for TrackBack.
 * Combines a modern shield (representing trust/security/verification) 
 * with a tracking loop and central dot (representing recovery and path back).
 */
export default function Logo({ size = 32, showText = false, textColor = '#003135', style = {} }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', ...style }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 120 120" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="logo-shield-grad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0FA4AF" />
            <stop offset="100%" stopColor="#024950" />
          </linearGradient>
          <filter id="logo-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <shadow rgba="0,0,0,0.1" dx="2" dy="2" blur="4" />
          </filter>
        </defs>
        
        {/* Outer Hexagon / Shield representing protection and structure */}
        <path 
          d="M60 10 L105 35 L105 85 L60 110 L15 85 L15 35 Z" 
          fill="url(#logo-shield-grad)" 
          stroke="#003135" 
          strokeWidth="3"
          strokeLinejoin="round" 
        />
        
        {/* Sleek track-back loop overlay */}
        <path 
          d="M60 30 A25 25 0 1 1 35 55 L35 75 A25 25 0 0 0 85 75" 
          stroke="#FFFFFF" 
          strokeWidth="6" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Highlight pointer dot representing the target item found */}
        <circle cx="60" cy="55" r="9" fill="#964734" stroke="#FFFFFF" strokeWidth="2.5" />
        
        {/* Arrowhead to emphasize returning/looping back */}
        <path 
          d="M85 75 L93 67 M85 75 L77 67" 
          stroke="#FFFFFF" 
          strokeWidth="5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ 
            fontFamily: 'Manrope, sans-serif', 
            fontWeight: 800, 
            fontSize: '1.35rem', 
            color: textColor, 
            letterSpacing: '-0.02em', 
            lineHeight: 1.1 
          }}>
            TrackBack
          </span>
          <span style={{ 
            fontFamily: 'Manrope, sans-serif', 
            fontSize: '0.68rem', 
            color: '#636E72', 
            fontWeight: 600, 
            letterSpacing: '0.06em', 
            textTransform: 'uppercase' 
          }}>
            Lost & Found
          </span>
        </div>
      )}
    </div>
  );
}
