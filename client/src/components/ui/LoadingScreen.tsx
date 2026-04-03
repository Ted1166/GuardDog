import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Random loading time between 3 and 7 seconds (3000-7000ms)
    const randomTime = Math.floor(Math.random() * (7000 - 3000 + 1) + 3000);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, randomTime);

    return () => clearTimeout(timer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 animate-fadeOut">
      {/* Huge Logo */}
      <div className="relative z-10 animate-float">
        <img
          src="/logo.png"
          alt="GuardDog"
          className="w-48 h-48 md:w-64 md:h-64 drop-shadow-[0_0_80px_rgba(59,130,246,0.6)] animate-pulse-glow"
        />
      </div>

      {/* Loading text */}
      <div className="mt-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white font-display mb-3 animate-pulse">
          GuardDog
        </h1>
        <p className="text-base md:text-lg text-gray-400 tracking-wider">
          Initializing Security...
        </p>
      </div>

      {/* Loading bar */}
      <div className="mt-10 w-80 md:w-96 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500 animate-loadingBar" />
      </div>
    </div>
  );
}