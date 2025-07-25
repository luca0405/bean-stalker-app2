import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Show splash for 2.5 seconds with animations
    const timer = setTimeout(() => {
      setIsAnimating(false);
      // Complete splash after fade out animation
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`
      fixed inset-0 z-[9999] 
      bg-green-800 
      flex flex-col items-center justify-center
      transition-opacity duration-500
      ${isAnimating ? 'opacity-100' : 'opacity-0'}
    `}>
      {/* Status bar background for iOS */}
      <div className="absolute top-0 left-0 right-0 h-safe bg-green-800" />
      
      {/* Main content container */}
      <div className="flex flex-col items-center justify-center flex-1 px-8">
        
        {/* Logo container with animation */}
        <div className={`
          transform transition-all duration-1000 ease-out
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}
        `}>
          {/* Logo image */}
          <div className="relative">
            <img 
              src="/attached_assets/BEAN STALKER BRANDING (16)_1753425187386.png"
              alt="Bean Stalker"
              className="w-32 h-32 object-contain filter brightness-0 invert"
              style={{ 
                filter: 'brightness(0) invert(1)',
                maxWidth: '128px',
                maxHeight: '128px'
              }}
            />
            
            {/* Animated pulse ring */}
            <div className={`
              absolute inset-0 rounded-full border-2 border-white/30
              ${isAnimating ? 'animate-ping' : ''}
            `} />
          </div>
        </div>

        {/* App name with fade-in animation */}
        <div className={`
          mt-8 transform transition-all duration-1000 delay-300 ease-out
          ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}>
          <h1 className="text-white text-3xl font-bold tracking-wider text-center">
            BEAN STALKER
          </h1>
          <p className="text-white/80 text-lg text-center mt-2 font-medium">
            Premium Coffee Experience
          </p>
        </div>

        {/* Loading indicator */}
        <div className={`
          mt-12 transform transition-all duration-1000 delay-500 ease-out
          ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>

      {/* Bottom safe area */}
      <div className="h-safe bg-green-800" />
    </div>
  );
}