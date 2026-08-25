import React, { useState } from 'react';

interface HannaBeeLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'compact' | 'monochrome' | 'badge';
  className?: string;
  showPhone?: boolean;
  showTagline?: boolean;
}

export const HannaBeeLogo: React.FC<HannaBeeLogoProps> = ({
  size = 'md',
  variant = 'full',
  className = '',
  showPhone = true,
  showTagline = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    xs: { container: 'w-7 h-7', img: 'w-7 h-7', text: 'text-xs', subtext: 'text-[8px]' },
    sm: { container: 'w-10 h-10', img: 'w-10 h-10', text: 'text-xs', subtext: 'text-[9px]' },
    md: { container: 'w-14 h-14', img: 'w-14 h-14', text: 'text-sm', subtext: 'text-[10px]' },
    lg: { container: 'w-20 h-20', img: 'w-20 h-20', text: 'text-base', subtext: 'text-xs' },
    xl: { container: 'w-28 h-28', img: 'w-28 h-28', text: 'text-xl', subtext: 'text-xs' },
    '2xl': { container: 'w-36 h-36', img: 'w-36 h-36', text: 'text-2xl', subtext: 'text-sm' },
  };

  const isMono = variant === 'monochrome';
  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Visual Logo Container */}
      <div
        className={`relative ${currentSize.container} shrink-0 rounded-2xl overflow-hidden shadow-xs border border-amber-400/30 bg-black flex items-center justify-center transition hover:scale-105 duration-200`}
      >
        {!imgError ? (
          <img
            src="/logo.png"
            alt="HannaBee Logo"
            className={`${currentSize.img} object-contain p-0.5`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          /* SVG Fallback Emblem */
          <svg
            viewBox="0 0 240 240"
            className="w-full h-full p-1"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="120" cy="120" r="112" fill={isMono ? '#ffffff' : '#0f172a'} stroke={isMono ? '#000000' : '#fef08a'} strokeWidth="3.5" />
            <circle cx="120" cy="120" r="104" stroke={isMono ? '#000000' : '#f97316'} strokeWidth="1.5" strokeDasharray="4 3" />
            <ellipse cx="120" cy="38" rx="9" ry="5.5" fill={isMono ? '#000000' : '#fef3c7'} />
            <path d="M120 46 C115 54, 110 59, 114 66 C117 71, 123 71, 126 66 C130 59, 125 54, 120 46 Z" fill={isMono ? '#000000' : '#f97316'} />
            <path d="M50 102 C50 64, 82 48, 120 48 C158 48, 190 64, 190 102 Z" fill={isMono ? '#f3f4f6' : '#fef9c3'} stroke={isMono ? '#000000' : '#fef08a'} strokeWidth="2.5" />
            <text x="120" y="122" textAnchor="middle" fill={isMono ? '#000000' : '#fef3c7'} fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="24">HannaBee</text>
            <text x="120" y="146" textAnchor="middle" fill={isMono ? '#000000' : '#fef9c3'} fontFamily="system-ui, sans-serif" fontWeight="600" fontStyle="italic" fontSize="11">Jajanan Wareg Seger</text>
          </svg>
        )}
      </div>

      {/* Companion Typography */}
      {variant === 'full' && (
        <div className="text-center mt-1.5 space-y-0.5">
          <span className={`font-black text-slate-900 tracking-tight block ${currentSize.text}`}>
            HannaBee
          </span>
          {showTagline && (
            <span className={`text-amber-700 font-semibold tracking-wide block ${currentSize.subtext}`}>
              Jajanan Wareg Seger
            </span>
          )}
          {showPhone && (
            <span className="text-[10px] text-slate-500 font-mono block">
              WA: 0821-7886-7116
            </span>
          )}
        </div>
      )}
    </div>
  );
};
