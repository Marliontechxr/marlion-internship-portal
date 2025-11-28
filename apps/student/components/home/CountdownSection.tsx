'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
}

function calculateTimeLeft(targetDate: string) {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const difference = target - now;

  if (difference > 0) {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
  }
  return { days: 0, hours: 0, minutes: 0, seconds: 0 };
}

export function CountdownSection({ targetDate }: CountdownProps) {
  // Initialize with calculated time immediately
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Calculate immediately on mount
    setTimeLeft(calculateTimeLeft(targetDate));
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-marlion-primary/5 via-transparent to-transparent pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Registration Closes on <span className="text-marlion-primary">December 7th, 2025</span>
        </h2>
        <p className="text-slate-400 mb-10 text-lg">Don't miss your chance to be part of something amazing!</p>

        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {[
            { value: timeLeft.days, label: 'days' },
            { value: timeLeft.hours, label: 'hours' },
            { value: timeLeft.minutes, label: 'minutes' },
            { value: timeLeft.seconds, label: 'seconds' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center group">
              <div className="relative">
                <span className="text-4xl md:text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-mono tracking-tighter group-hover:to-marlion-primary transition-all duration-300">
                  {mounted ? item.value.toString().padStart(2, '0') : '--'}
                </span>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-marlion-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <span className="text-[10px] md:text-xs font-bold text-marlion-muted uppercase tracking-[0.3em] mt-2 border-t border-transparent group-hover:border-marlion-primary/50 pt-2 transition-all">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
