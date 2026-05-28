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
    .innerRadius(20) // Small hole in center
    .outerRadius(radius - padding); // Padding for border

  const arcs = pie(segments);

  // TARGET ANGLE: The pointer is on the LEFT side (9 o'clock)
  // In D3 coordinate system (0 at 12 o'clock), 9 o'clock is 270 degrees.
  const POINTER_ANGLE = 270;

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
    // Max width 800px
    <div className="relative flex justify-center items-center w-full max-w-[800px] mx-auto aspect-square p-4">

      {/* Indicator Arrow - Left Side (9 o'clock) pointing inward (Right) */}
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 translate-x-1 rotate-[-90deg]`}>
         {/* Using a simple triangle shape via borders */}
         <div className={`w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] drop-shadow-xl ${currentTheme.indicator.replace('text-', 'border-t-')}`}></div>
      </div>

      {/* Wheel Body */}
      <div className={`w-full h-full rounded-full border-[10px] ${currentTheme.wheelBorder} shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-800 relative overflow-hidden transition-colors duration-500`}>

        {/* Rotating SVG */}
        <div
            className="w-full h-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              willChange: 'transform'
            }}
        >
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
             <g transform={`translate(${size/2},${size/2})`}>
                {arcs.map((d, i) => {
                   // Angle for text placement
                   const angle = (d.startAngle + d.endAngle) / 2 * 180 / Math.PI;
                   return (
                    <g key={segments[i].id}>
                      <path
                        d={arc(d) || undefined}
                        fill={segments[i].color}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />
                      <text
                        transform={`rotate(${angle + 90}) translate(-${radius - 20}, 0)`}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fill={segments[i].textColor}
                        className="wheel-font"
                        fontSize={Math.max(16, 40 - (segments.length * 0.5))}
                        fontWeight="bold"
                        style={{ textRendering: 'optimizeLegibility' }}
                      >
                        {segments[i].text.length > 25 ? segments[i].text.substring(0, 22) + '..' : segments[i].text}
                      </text>
                    </g>
                  );
                })}
             </g>
          </svg>
        </div>
      </div>

      {/* Center Cap with Text - Reduced Size */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white border-4 border-slate-200 shadow-xl z-10 flex items-center justify-center">
         <span className="text-slate-800 font-black text-xs tracking-widest">SPIN</span>
      </div>
    </div>
  );
});

Wheel.displayName = 'Wheel';

export default Wheel;
