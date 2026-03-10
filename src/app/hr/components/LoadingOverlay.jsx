"use client";

import { useHrLoading } from "../HrLoadingContext";

export default function LoadingOverlay() {
  const { pageLoading } = useHrLoading();

  if (!pageLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-lg transition-opacity duration-300">
      <div className="flex flex-col items-center justify-center space-y-8 animate-fade-in">
        {/* Professional Spinner */}
        <div className="relative">
          {/* Outer static ring with gradient */}
          <div className="w-24 h-24 border-4 border-orange-500/10 rounded-full"></div>
          {/* Primary rotating ring */}
          <div className="absolute top-0 left-0 w-24 h-24 border-4 border-transparent border-t-orange-500 border-r-orange-500/50 rounded-full animate-spin" style={{ animationDuration: '1s' }}></div>
          {/* Secondary rotating ring (counter-clockwise) */}
          <div className="absolute top-0 left-0 w-24 h-24 border-4 border-transparent border-b-orange-400 border-l-orange-400/50 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
          {/* Inner pulsing dot with glow */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-lg shadow-orange-500/50"></div>
        </div>
        
        {/* Loading text with animation */}
        <div className="text-center space-y-2">
          <p className="text-white text-xl font-bold tracking-wide animate-pulse">
            Loading...
          </p>
          <p className="text-white/70 text-sm font-medium">
            Please wait while we fetch your data
          </p>
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1 mt-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
