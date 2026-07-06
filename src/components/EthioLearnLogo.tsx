/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface EthioLearnLogoProps {
  className?: string;
  size?: number | string;
  showCardBackground?: boolean;
}

export default function EthioLearnLogo({ 
  className = '', 
  size = 40, 
  showCardBackground = false 
}: EthioLearnLogoProps) {
  return (
    <svg
      className={`select-none shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Rich Metallic Gold Gradients */}
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFECA7" />
          <stop offset="35%" stopColor="#D4AF37" />
          <stop offset="70%" stopColor="#AA7C11" />
          <stop offset="100%" stopColor="#F3E5AB" />
        </linearGradient>

        <linearGradient id="goldOutline" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8A6614" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#FFECA7" />
        </linearGradient>

        {/* Deep Crimson/Maroon Page Gradient */}
        <linearGradient id="crimsonPage" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A81C2E" />
          <stop offset="50%" stopColor="#7E101F" />
          <stop offset="100%" stopColor="#4A050E" />
        </linearGradient>

        {/* Vibrant Emerald/Green Page Gradient */}
        <linearGradient id="emeraldPage" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1B6F42" />
          <stop offset="50%" stopColor="#114C2B" />
          <stop offset="100%" stopColor="#082A16" />
        </linearGradient>

        {/* Shadow filter to make it look 3D */}
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Styled Card Background (simulating app logo box from image) */}
      {showCardBackground && (
        <rect
          x="4"
          y="4"
          width="192"
          height="192"
          rx="52"
          fill="#FFFFFF"
          stroke="url(#goldGrad)"
          strokeWidth="6"
        />
      )}

      <g filter="url(#logoShadow)">
        {/* ========================================================
            1. INNER PAGE LAYERS (Gives 3D multi-page book thickness)
            ======================================================== */}
        {/* Outer Crimson border representation */}
        <path
          d="M 94 80 C 65 72 41 84 37 137 C 54 148 76 151 94 148 Z"
          fill="#4A050E"
          stroke="url(#goldGrad)"
          strokeWidth="2"
        />
        {/* Outer Emerald border representation */}
        <path
          d="M 106 80 C 135 72 159 84 163 137 C 146 148 124 151 106 148 Z"
          fill="#082A16"
          stroke="url(#goldGrad)"
          strokeWidth="2"
        />

        {/* ========================================================
            2. PRIMARY WINGS (Crimson and Emerald Pages)
            ======================================================== */}
        {/* Crimson Page Left (curving upward, outward and down) */}
        <path
          d="M 94 84 C 67 76 45 88 41 133 C 58 143 78 146 94 143 Z"
          fill="url(#crimsonPage)"
          stroke="url(#goldGrad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Emerald Page Right (symmetric layout) */}
        <path
          d="M 106 84 C 133 76 155 88 159 133 C 142 143 122 146 106 143 Z"
          fill="url(#emeraldPage)"
          stroke="url(#goldGrad)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Inner white sheet edge lines representing book margins */}
        <path
          d="M 91 88 C 72 82 52 92 48 128"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          strokeDasharray="1 3"
          fill="none"
        />
        <path
          d="M 109 88 C 128 82 148 92 152 128"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          strokeDasharray="1 3"
          fill="none"
        />

        {/* ========================================================
            3. AXUM OBELISK (Ancient Pillar of Knowledge & Architecture)
            ======================================================== */}
        {/* Tapered obelisk column base and shaft */}
        <path
          d="M 92 78 L 108 78 L 114 158 L 86 158 Z"
          fill="url(#goldGrad)"
          stroke="url(#goldOutline)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Architectural Tier Lines (Axum Obelisk carvings and accents) */}
        <line x1="91" y1="92" x2="109" y2="92" stroke="#4B3907" strokeWidth="2" />
        <line x1="90" y1="108" x2="110" y2="108" stroke="#4B3907" strokeWidth="2" />
        <line x1="88" y1="126" x2="112" y2="126" stroke="#4B3907" strokeWidth="2" />
        <line x1="87" y1="142" x2="113" y2="142" stroke="#4B3907" strokeWidth="2" />

        {/* Window accents (Representing traditional obelisk structure) */}
        <rect x="96" y="96" width="8" height="6" rx="1" fill="#4B3907" />
        <rect x="96" y="112" width="8" height="8" rx="1" fill="#4B3907" />
        <rect x="95" y="130" width="10" height="8" rx="1" fill="#4B3907" />

        {/* Center alignment highlight ridge */}
        <path
          d="M 100 78 L 100 158"
          stroke="#FFECA7"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* ========================================================
            4. GOLDEN STAR (Aspiration and Brilliant Intellect)
            ======================================================== */}
        <polygon
          points="100,28 107,43 123,43 110,53 115,69 100,59 85,69 90,53 77,43 93,43"
          fill="url(#goldGrad)"
          stroke="url(#goldOutline)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Star highlights to create the facets */}
        <polygon points="100,28 100,59 107,43" fill="#FFECA7" opacity="0.4" />
        <polygon points="100,28 100,59 93,43" fill="#8A6614" opacity="0.15" />
        <polygon points="100,59 115,69 110,53" fill="#FFECA7" opacity="0.3" />
        <polygon points="100,59 85,69 90,53" fill="#8A6614" opacity="0.2" />
        <polygon points="123,43 100,59 110,53" fill="#FFECA7" opacity="0.4" strokeLinejoin="round" />
        <polygon points="77,43 100,59 90,53" fill="#8A6614" opacity="0.2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
