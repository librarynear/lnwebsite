'use client';

import { useState, useEffect, useRef } from 'react';
import { Flame, Key, User as UserIcon } from 'lucide-react';
import { AccessQRModal } from '@/components/AccessQRModal';

interface DigitalPassCardProps {
  student: {
    name: string | null;
    uniqueId: string;
    profilePhotoUrl: string | null;
  };
  currentStreak: number;
  libraryId: string;
  studentId: string;
  isCheckedIn: boolean;
}

export function DigitalPassCard({ student, currentStreak, libraryId, studentId, isCheckedIn }: DigitalPassCardProps) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Very subtle tilt: limit between -15 and 15 degrees
      let beta = event.beta || 0; // x-axis (-180 to 180)
      let gamma = event.gamma || 0; // y-axis (-90 to 90)
      
      // clamp
      beta = Math.max(-15, Math.min(15, beta));
      gamma = Math.max(-15, Math.min(15, gamma));
      
      setTilt({ x: beta, y: gamma });
    };

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  return (
    <div 
      ref={cardRef}
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-md flex flex-col relative group transition-transform duration-200"
      style={{
        transform: `perspective(1000px) rotateX(${-tilt.x}deg) rotateY(${tilt.y}deg)`,
        transformStyle: 'preserve-3d'
      }}
    >
      {/* Subtle Holographic glare effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none transition-transform duration-75"
        style={{
          transform: `translateX(${tilt.y * 2}%) translateY(${tilt.x * 2}%)`
        }}
      />

      {/* Streak header banner inside card */}
      <div className="bg-gradient-to-r from-orange-500/10 to-orange-400/10 border-b border-orange-500/20 px-6 py-3 flex items-center justify-between">
        <span className="font-heading font-bold text-sm tracking-wide text-orange-600 dark:text-orange-400">Activity Streak</span>
        <div className="flex items-center gap-1.5 bg-background rounded-full px-3 py-1 shadow-sm border border-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-sm">
          <Flame className="w-4 h-4 fill-current animate-pulse" />
          {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-6 pb-4 flex flex-col items-center text-center relative z-10" style={{ transform: 'translateZ(20px)' }}>
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4 shadow-inner ring-4 ring-background relative">
          {student.profilePhotoUrl ? (
            <img src={student.profilePhotoUrl} alt={student.name || ''} className="w-full h-full rounded-full object-cover" />
          ) : (
            <UserIcon className="w-10 h-10" />
          )}
        </div>
        <div className="bg-muted px-3 py-1 rounded-md font-mono font-bold text-sm tracking-widest text-foreground border border-border/50 select-all mb-2">
          {student.uniqueId}
        </div>
      </div>

      {/* Vibrant QR area */}
      <div className="px-6 pb-6 w-full flex flex-col items-center relative z-10" style={{ transform: 'translateZ(10px)' }}>
        <AccessQRModal 
          libraryId={libraryId} 
          studentId={studentId}
          isCheckedIn={isCheckedIn}
        >
          <div 
            className="w-full max-w-[220px] aspect-square bg-card rounded-xl p-3 shadow-inner border border-border relative overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(15);
            }}
          >
            {/* Vibrant flowing gradient instead of QR blur */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-purple-500/80 to-orange-500/80 bg-[length:200%_200%] animate-liquid opacity-90" />
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center transition-all">
              <div className="bg-background/90 text-foreground text-xs font-bold px-4 py-2 rounded-full shadow-xl border border-border backdrop-blur-md flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-primary" /> Tap to reveal Pass
              </div>
            </div>
          </div>
        </AccessQRModal>
      </div>
    </div>
  );
}
