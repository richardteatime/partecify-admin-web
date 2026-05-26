"use client";

import React from 'react';
import { AppSettings, THEMES } from './types';

interface ControlsProps {
  onSpin: () => void;
  onOpenSettings: () => void;
  isSpinning: boolean;
  settings: AppSettings;
  winner: string | null;
}

const Controls: React.FC<ControlsProps> = ({
  onSpin,
  onOpenSettings,
  isSpinning,
  settings,
  winner
}) => {
  const themeStyles = THEMES[settings.theme];

  return (
    <div className="flex flex-col gap-4 items-center w-full max-w-md mx-auto mt-8 z-10 relative">

      {/* Spin Button */}
      <button
        onClick={onSpin}
        disabled={isSpinning}
        className={`w-full py-4 text-2xl font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] transform transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale ${themeStyles.button} ${themeStyles.buttonText}`}
      >
        {isSpinning ? 'Spinning...' : 'SPIN THE WHEEL'}
      </button>

      <div className="flex w-full gap-3">
         {/* Settings Trigger */}
         <button
           onClick={onOpenSettings}
           className="w-full py-3 px-4 bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors text-slate-200 font-bold text-sm uppercase"
         >
           Impostazioni
         </button>
      </div>

      {winner && (
        <div className="text-center mt-2">
          <p className="text-sm text-slate-400 uppercase tracking-widest">Ultimo vincitore</p>
          <p className="text-xl font-bold text-white">{winner}</p>
        </div>
      )}
    </div>
  );
};

export default Controls;
