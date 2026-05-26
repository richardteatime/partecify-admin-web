"use client";

import React from 'react';
import { WheelSegment } from './types';

interface WinnerModalProps {
  winner: WheelSegment | null;
  onClose: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ winner, onClose }) => {
  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="relative text-center">

        {/* Confetti effect placeholder or just CSS glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 rounded-full blur-[100px] opacity-30 animate-pulse"></div>

        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] mb-4 animate-bounce">
            WINNER!
          </h2>

          <div className="p-1 rounded-2xl bg-gradient-to-r from-transparent via-white to-transparent w-full mb-8 opacity-50"></div>

          <h3 className="text-5xl md:text-7xl font-bold text-white mb-12 drop-shadow-lg break-words max-w-[90vw]">
            {winner.text}
          </h3>

          <button
            onClick={onClose}
            className="px-10 py-4 bg-white text-black font-black text-xl rounded-full shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:scale-110 transition-transform"
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinnerModal;
