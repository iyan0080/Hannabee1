import React from 'react';

interface HannaBeeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact' | 'monochrome';
  className?: string;
  showPhone?: boolean;
}

export const HannaBeeLogo: React.FC<HannaBeeLogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
  showPhone = true,
}) => {
  const sizeMap = {
    sm: { container: 'w-10 h-10', text: 'text-xs', subtext: 'text-[7px]' },
    md: { container: 'w-14 h-14', text: 'text-sm', subtext: 'text-[9px]' },
    lg: { container: 'w-24 h-24', text: 'text-lg', subtext: 'text-[11px]' },
    xl: { container: 'w-36 h-36', text: 'text-2xl', subtext: 'text-xs' },
  };

  const isMono = variant === 'monochrome';

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Visual SVG Circular Emblem */}
      <svg
        viewBox="0 0 240 240"
        className={`${sizeMap[size].container} shrink-0 drop-shadow-xs`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circular badge */}
        <circle
          cx="120"
          cy="120"
          r="112"
          fill={isMono ? '#ffffff' : '#0f172a'}
          stroke={isMono ? '#000000' : '#fef08a'}
          strokeWidth="3.5"
        />
        
        {/* Outer Accent Ring */}
        <circle
          cx="120"
          cy="120"
          r="104"
          stroke={isMono ? '#000000' : '#f97316'}
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />

        {/* Serving Dome / Cloche Top Handle */}
        <ellipse
          cx="120"
          cy="38"
          rx="9"
          ry="5.5"
          fill={isMono ? '#000000' : '#fef3c7'}
        />

        {/* Flame on top of dome */}
        <path
          d="M120 46 C115 54, 110 59, 114 66 C117 71, 123 71, 126 66 C130 59, 125 54, 120 46 Z"
          fill={isMono ? '#000000' : '#f97316'}
        />
        <path
          d="M120 54 C117 58, 115 62, 118 66 C120 69, 124 68, 125 64 C126 60, 123 57, 120 54 Z"
          fill={isMono ? '#ffffff' : '#fef08a'}
        />

        {/* Cloche Dome Main Curve */}
        <path
          d="M50 102 C50 64, 82 48, 120 48 C158 48, 190 64, 190 102 Z"
          fill={isMono ? '#f3f4f6' : '#fef9c3'}
          stroke={isMono ? '#000000' : '#fef08a'}
          strokeWidth="2.5"
        />

        {/* Fork on Left Side */}
        <path
          d="M26 122 C32 116, 44 110, 56 106 M26 122 L32 136 M26 122 L36 128 M30 118 L40 124 M35 114 L45 120"
          stroke={isMono ? '#000000' : '#fef08a'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Spoon on Right Side */}
        <path
          d="M214 96 C206 102, 192 108, 178 112 M214 96 C219 90, 224 88, 222 82 C219 76, 212 78, 208 84 C205 88, 208 92, 214 96 Z"
          fill={isMono ? '#000000' : '#fef08a'}
          stroke={isMono ? '#000000' : '#fef08a'}
          strokeWidth="2"
        />

        {/* Middle Banner for HANNABEE Brand */}
        <ellipse
          cx="120"
          cy="114"
          rx="72"
          ry="20"
          fill={isMono ? '#ffffff' : '#0f172a'}
          stroke={isMono ? '#000000' : '#fef08a'}
          strokeWidth="2"
        />

        {/* Brand Name Text: HannaBee */}
        <text
          x="120"
          y="122"
          textAnchor="middle"
          fill={isMono ? '#000000' : '#fef3c7'}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="24"
          letterSpacing="0.5"
        >
          HannaBee
        </text>

        {/* Sub-tagline: Jajanan Wareg Seger */}
        <text
          x="120"
          y="146"
          textAnchor="middle"
          fill={isMono ? '#000000' : '#fef9c3'}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontStyle="italic"
          fontSize="11"
          letterSpacing="0.5"
        >
          Jajanan Wareg Seger
        </text>

        {/* Bottom Arc Banner */}
        <path
          d="M48 154 C66 186, 174 186, 192 154"
          stroke={isMono ? '#000000' : '#f97316'}
          strokeWidth="1.5"
          fill="none"
        />

        {/* Pemesanan text on bottom curve */}
        <path id="phoneCurve" d="M38 152 C65 210, 175 210, 202 152" fill="none" />
        <text fill={isMono ? '#000000' : '#f97316'} fontSize="9.5" fontWeight="800" letterSpacing="1">
          <textPath href="#phoneCurve" startOffset="50%" textAnchor="middle">
            PEMESANAN : 0821 7886 7116
          </textPath>
        </text>
      </svg>

      {/* Optional companion typography */}
      {variant === 'full' && (
        <div className="text-center mt-1">
          <span className="font-extrabold text-slate-900 tracking-tight block text-sm">
            HannaBee
          </span>
          <span className="text-[10px] text-amber-600 font-medium tracking-wide block">
            Jajanan Wareg Seger
          </span>
          {showPhone && (
            <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
              WA: 0821-7886-7116
            </span>
          )}
        </div>
      )}
    </div>
  );
};
