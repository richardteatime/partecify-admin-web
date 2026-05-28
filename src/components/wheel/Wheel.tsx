"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as d3 from 'd3-shape';
import { WheelSegment, ThemeName, THEMES } from './types';
import { playTickSound, playWinSound } from './utils/sound';

interface WheelProps {
  segments: WheelSegment[];
  theme: ThemeName;
  soundEnabled: boolean;
  forcedWinner: string | null;
  onSpinEnd: (winner: WheelSegment) => void;
  isSpinning: boolean;
  setIsSpinning: (state: boolean) => void;
}

export interface WheelHandle {
  spin: (winnerOverride?: string | null) => void;
}

const Wheel = forwardRef<WheelHandle, WheelProps>(({
  segments,
  theme,
  soundEnabled,
  forcedWinner,
  onSpinEnd,
  isSpinning,
  setIsSpinning
}, ref) => {
  const [rotation, setRotation] = useState(0);
  const currentTheme = THEMES[theme];

  // Animation Refs
  const rAF = useRef<number>(0);
  const currentRotRef = useRef(0);
  const lastSegmentIndex = useRef(-1);

  // Setup D3 Arc Generator
  const size = 500;
  const radius = size / 2;
  const padding = 10;

  const pie = d3.pie<WheelSegment>()
    .sort(null)
    .value(() => 1); // Equal slices

  const arc = d3.arc<d3.PieArcDatum<WheelSegment>>()
    .innerRadius(45) // Larger hole for center cap
    .outerRadius(radius - padding); // Padding for border

  const arcs = pie(segments);

  // TARGET ANGLE: The pointer is on the TOP (12 o'clock)
  // In D3 coordinate system (0 at 12 o'clock), 12 o'clock is 0/360 degrees.
  const POINTER_ANGLE = 0;

  useImperativeHandle(ref, () => ({
    spin: (winnerOverride?: string | null) => {
      if (isSpinning) return;
      setIsSpinning(true);

      const targetWinner = winnerOverride !== undefined ? winnerOverride : forcedWinner;

      // Configuration for the spin
      const MIN_SPINS = 8; // Minimum full rotations
      const SPINS_DURATION = 8000; // 8 seconds duration for everyone

      let targetAngle = 0;
      const currentRot = currentRotRef.current;
      const baseTarget = currentRot + (360 * MIN_SPINS);

      if (targetWinner) {
        // --- RIGGED MODE ---
        const winIndex = segments.findIndex(s => s.text === targetWinner);
        if (winIndex !== -1) {
          // Calculate the exact angle to land on this segment at the pointer
          const count = segments.length;
          const segmentAngle = 360 / count;

          // Center angle of the winning segment in local space (0 = 12 o'clock)
          const winAngleLocal = (winIndex + 0.5) * segmentAngle;

          // We want: (FinalRotation + winAngleLocal) % 360 === POINTER_ANGLE
          // Therefore: FinalRotation = POINTER_ANGLE - winAngleLocal (+ k * 360)

          // Calculate the target rotation modulo 360
          let targetMod = (POINTER_ANGLE - winAngleLocal) % 360;
          if (targetMod < 0) targetMod += 360;

          // Calculate how much we need to add to baseTarget to reach the correct modulus
          const currentMod = baseTarget % 360;
          let diff = targetMod - currentMod;
          if (diff < 0) diff += 360; // Ensure positive forward rotation

          targetAngle = baseTarget + diff;
        } else {
          // Fallback if name not found
          targetAngle = baseTarget + (Math.random() * 360);
        }
      } else {
        // --- RANDOM MODE ---
        // Just pick a random angle ahead
        targetAngle = baseTarget + (Math.random() * 360);
      }

      // Start the unified animation
      animateToTarget(targetAngle, SPINS_DURATION);
    }
  }));

  const animateToTarget = (target: number, duration: number) => {
    const start = currentRotRef.current;
    const distance = target - start;
    let startTime: number | null = null;

    // Cubic Ease Out - Starts fast, slows down smoothly
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOutCubic(progress);
      const newRot = start + (distance * easedProgress);

      updateRotationState(newRot);

      if (progress < 1) {
        rAF.current = requestAnimationFrame(step);
      } else {
        finishSpin();
      }
    };
    rAF.current = requestAnimationFrame(step);
  };

  const updateRotationState = (deg: number) => {
    setRotation(deg);
    currentRotRef.current = deg;

    // Audio tick logic
    // Calculate which segment is effectively under the pointer
    let effectiveAngle = (POINTER_ANGLE - (deg % 360)) % 360;
    if (effectiveAngle < 0) effectiveAngle += 360;

    const segmentAngle = 360 / segments.length;
    const currentIndex = Math.floor(effectiveAngle / segmentAngle);

    if (currentIndex !== lastSegmentIndex.current) {
      if (soundEnabled && isSpinning) playTickSound();
      lastSegmentIndex.current = currentIndex;
    }
  };

  const finishSpin = () => {
    setIsSpinning(false);
    cancelAnimationFrame(rAF.current);

    if (soundEnabled) playWinSound();

    // Determine winner based on final rotation logic
    let effectiveAngle = (POINTER_ANGLE - (currentRotRef.current % 360)) % 360;
    if (effectiveAngle < 0) effectiveAngle += 360;

    const segmentAngle = 360 / segments.length;
    let winningIndex = Math.floor(effectiveAngle / segmentAngle);

    // Safety clamp
    if (winningIndex < 0) winningIndex = 0;
    if (winningIndex >= segments.length) winningIndex = 0;

    onSpinEnd(segments[winningIndex]);
  };

  useEffect(() => {
    return () => cancelAnimationFrame(rAF.current);
  }, []);

  return (
    <div className="relative flex justify-center items-center w-full max-w-[800px] mx-auto aspect-square p-4 animate-in fade-in zoom-in duration-700">

      {/* Top Pointer (12 o'clock) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
      >
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderTop: `36px solid var(--indicator-color)`,
          }}
        />
      </div>

      {/* Wheel Body with Glow */}
      <div
        className={`w-full h-full rounded-full border-[8px] ${currentTheme.wheelBorder} relative overflow-hidden transition-all duration-700`}
        style={{
          boxShadow: `0 0 60px ${currentTheme.glowColor}, inset 0 0 40px rgba(0,0,0,0.6)`,
          background: '#0f172a',
        }}
      >
        {/* Rotating SVG */}
        <div
          className="w-full h-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            willChange: 'transform',
          }}
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
            <defs>
              <filter id="text-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.8)" />
              </filter>
            </defs>
            <g transform={`translate(${size / 2},${size / 2})`}>
              {arcs.map((d, i) => {
                const midAngle = (d.startAngle + d.endAngle) / 2;
                const angleDeg = midAngle * 180 / Math.PI;
                // Position text at 70% of outer radius for better readability
                const textRadius = (radius - padding) * 0.68;
                const tx = Math.cos(midAngle - Math.PI / 2) * textRadius;
                const ty = Math.sin(midAngle - Math.PI / 2) * textRadius;
                const fontSize = Math.max(12, Math.min(22, 38 - segments.length * 0.8));
                const label = segments[i].text.length > 22
                  ? segments[i].text.substring(0, 19) + '...'
                  : segments[i].text;
                return (
                  <g key={segments[i].id}>
                    <path
                      d={arc(d) || undefined}
                      fill={segments[i].color}
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={segments[i].textColor}
                      fontSize={fontSize}
                      fontWeight="bold"
                      fontFamily="system-ui, -apple-system, sans-serif"
                      filter="url(#text-shadow)"
                      style={{
                        textRendering: 'optimizeLegibility',
                        userSelect: 'none',
                      }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Center Cap */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full ${currentTheme.centerGradient} ${currentTheme.centerBorder} border-[3px] z-10 flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
      >
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md">
            <path fillRule="evenodd" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A11.959 11.959 0 013.22 14.25m0 0A8.959 8.959 0 013 12c0-.778.099-1.533.284-2.253m0 0A11.959 11.959 0 0112 3.75c2.998 0 5.74 1.1 7.843 2.918" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <style jsx>{`
        .animate-in {
          animation: wheelIn 0.7s ease-out both;
        }
        @keyframes wheelIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
});

Wheel.displayName = 'Wheel';

export default Wheel;
