'use client';

import { Flame, ScanLine, Camera } from 'lucide-react';
import { AccessQRModal } from '@/components/AccessQRModal';
import { useEffect, useState } from 'react';

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
  const theme = 'light'; // Hardcoded to match the finalized light mode preference
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Good evening,');

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning,');
    else if (hour < 17) setGreeting('Good afternoon,');
    else setGreeting('Good evening,');
  }, []);

  const formatName = (name: string | null) => {
    if (!name) return "STUDENT";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].toUpperCase();
    return `${parts[0].toUpperCase()}  ${parts[parts.length - 1][0].toUpperCase()}.`;
  };

  const formattedName = formatName(student.name);

  // Avoid hydration mismatch by rendering a safe default before mount
  if (!mounted) return <div className="w-full max-w-[400px] mx-auto aspect-[3/5] bg-card rounded-2xl animate-pulse border border-border"></div>;

  return (
    <div className="relative w-full max-w-[400px] mx-auto">
      {/* The Poster Card */}
      <div className={`relative w-full rounded-sm overflow-hidden shadow-2xl transition-colors duration-500 ${theme === 'dark' ? 'bg-[#1A1A1A] text-white shadow-black/80' : 'bg-white text-black shadow-black/20'}`}>
        
        {/* Top Graphic Header */}
        <div className={`w-full px-6 py-4 flex items-center justify-between border-b-[3px] ${theme === 'dark' ? 'border-[#333] bg-[#222]' : 'border-black bg-slate-100'}`}>
          <div className="flex flex-col justify-center">
            <span className="font-serif italic text-lg opacity-80 mb-1">{greeting}</span>
            <span className="font-heading font-black text-4xl uppercase tracking-tighter leading-none">{formattedName}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50">Streak</span>
            <span className="font-mono font-bold text-xl flex items-center gap-1">
              <Flame className="w-5 h-5 text-[#2781CA] drop-shadow-[0_0_8px_rgba(39,129,202,0.8)]" /> {currentStreak}
            </span>
          </div>
        </div>

        {/* Photo Framing Area - Stylized blue block */}
        <div className="relative w-full aspect-square bg-[#2781CA] flex flex-col items-center justify-end overflow-hidden p-6">
          {/* Lanyard Hole Mockup */}
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full border-2 shadow-inner ${theme === 'dark' ? 'bg-[#111] border-black/50' : 'bg-[#ddd] border-black/10'}`}></div>

          {/* Decorative Text */}
          <div className="absolute top-1/4 -left-6 -rotate-90 text-[10px] font-mono font-bold tracking-[0.4em] opacity-50 text-black">
            FOCUSX // DIGITAL PASS // {new Date().getFullYear()}
          </div>

          <div className="absolute bottom-6 right-6 w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl rotate-12">
            <span className="text-[#2781CA] font-heading font-bold text-xl leading-none text-center">FX<br/>48</span>
          </div>

          {/* The Student Photo inside a graphic frame */}
          <div className="relative w-[85%] aspect-[3/4] border-[4px] border-white shadow-2xl bg-[#0a0a0a] overflow-hidden -mb-16 rotate-[-2deg] flex items-center justify-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CiAgPHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPgogIDxwYXRoIGQ9Ik0wIDM5aDQwVjQwSDB6IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+CiAgPHBhdGggZD0iTTM5IDB2NDBoMVYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPgo8L3N2Zz4=')] opacity-30 mix-blend-overlay z-20 pointer-events-none"></div>
            {student.profilePhotoUrl ? (
              <img src={student.profilePhotoUrl} alt="Student" className="w-full h-full object-cover filter grayscale contrast-125 mix-blend-luminosity opacity-90 relative z-10" />
            ) : (
              <>
                <img src="https://api.dicebear.com/9.x/micah/svg?seed=placeholder&backgroundColor=2781CA" alt="Placeholder" className="w-full h-full object-cover opacity-90 relative z-10" />
                <div className="absolute inset-0 backdrop-blur-sm bg-black/30 flex flex-col items-center justify-center gap-3 text-white z-30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-lg">
                    <Camera className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <span className="font-sans text-[11px] font-medium tracking-wide text-white/90 drop-shadow-md">Choose a photo</span>
                </div>
              </>
            )}
            {/* Photo overlay texture */}
            <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] z-20 pointer-events-none"></div>
          </div>
        </div>

        {/* Bottom Info & QR Area */}
        <div className="w-full p-6 pt-8 flex flex-col gap-6">
          
          {/* ID Tag */}
          <div className="flex items-end justify-between border-b-2 border-black/10 dark:border-white/10 pb-4">
            <div className="flex flex-col">
              <span className="font-mono font-bold text-2xl tracking-[0.1em]">{student.uniqueId}</span>
            </div>
          </div>

          {/* Graphic QR Skeleton wrapped with AccessQRModal */}
          <div className="w-full flex justify-center mt-2">
            <AccessQRModal 
              libraryId={libraryId} 
              studentId={studentId}
              isCheckedIn={isCheckedIn}
            >
              <div className={`relative w-full max-w-[280px] mx-auto aspect-[4/1] flex items-center justify-center border border-black group cursor-pointer overflow-hidden transition-all duration-300`}>
                
                {/* Faded QR Background */}
                <div className={`absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-cover bg-center bg-no-repeat opacity-[0.08] blur-[1px] ${theme === 'dark' ? 'invert' : ''}`}></div>

                {/* Scanner line horizontal */}
                <div className="absolute -left-[1px] -right-[1px] h-[1px] bg-[#2781CA] animate-scan z-20"></div>

                <div className="relative z-10 flex items-center gap-3">
                  <ScanLine className="w-5 h-5 opacity-70" />
                  <span className="font-mono font-bold text-sm tracking-[0.2em] uppercase">Tap to Scan Pass</span>
                </div>
              </div>
            </AccessQRModal>
          </div>

        </div>
      </div>
    </div>
  );
}
