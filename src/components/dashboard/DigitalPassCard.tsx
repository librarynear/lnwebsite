'use client';

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
  return (
    <div 
      className="bg-card rounded-2xl border border-border overflow-hidden shadow-md flex flex-col relative group"
    >
      {/* Subtle Holographic glare effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"
      />

      {/* Floating Streak Badge */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 shadow-lg border border-white/10">
        <Flame className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
        <span className="bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent font-bold text-xs uppercase tracking-wider">
          {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
        </span>
      </div>

      {/* Profile Info */}
      <div className="pt-10 px-6 pb-4 flex flex-col items-center text-center relative z-10" style={{ transform: 'translateZ(20px)' }}>
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
            {/* Faded QR Mockup */}
            <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-contain bg-center bg-no-repeat opacity-[0.15] scale-110" />
            
            {/* Vibrant flowing gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-purple-500/60 to-orange-500/60 bg-[length:200%_200%] animate-liquid mix-blend-overlay" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" />
            
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
