"use client";

import React from 'react';
import { AppSettings, THEMES } from './types';

interface ControlsProps {
  onSpin: () => void;
  isSpinning: boolean;
  settings: AppSettings;
  winner: string | null;
}

const Controls: React.FC<ControlsProps> = ({
  onSpin,
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
