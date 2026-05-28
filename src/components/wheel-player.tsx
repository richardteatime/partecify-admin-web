"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { adminService } from "@/services/admin-service";
import { WheelItem } from "@/types/admin";
import { WheelSegment, AppSettings, THEMES } from "@/components/wheel/types";
import Wheel, { WheelHandle } from "@/components/wheel/Wheel";
import Controls from "@/components/wheel/Controls";
import WinnerModal from "@/components/wheel/WinnerModal";

function generateSegments(names: string[], themeName: string): WheelSegment[] {
  const palette = THEMES[themeName as keyof typeof THEMES].colors;
  return names.map((name, index) => ({
    id: `seg-${index}-${Date.now()}`,
    text: name,
    color: palette[index % palette.length],
    textColor: "white",
  }));
}

export default function WheelPlayer() {
  const params = useParams();
  const wheelId = String(params.id ?? "");

  const [wheel, setWheel] = useState<WheelItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<AppSettings>({
    theme: "party",
    soundEnabled: true,
    forcedWinner: null,
    mode: "single",
    sequenceSteps: [],
    currentStepIndex: 0,
  });

  const [names, setNames] = useState<string[]>([]);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelSegment | null>(null);

  const wheelRef = useRef<WheelHandle>(null);

  useEffect(() => {
    if (!wheelId) return;
    adminService
      .fetchWheel(wheelId)
      .then((data) => {
        if (!data) {
          setError("Ruota non trovata.");
        } else {
          setWheel(data);
          setNames(data.participants);
          setSettings({
            theme: data.settings.theme,
            soundEnabled: data.settings.soundEnabled,
            forcedWinner: data.settings.forcedWinner,
            mode: data.settings.mode,
            sequenceSteps: data.settings.sequenceSteps,
            currentStepIndex: 0,
          });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Errore"))
      .finally(() => setLoading(false));
  }, [wheelId]);

  useEffect(() => {
    setSegments(generateSegments(names, settings.theme));
  }, [names, settings.theme]);

  const handleSpinStart = () => {
    setWinner(null);
    let winnerOverride: string | null = null;

    if (settings.mode === "sequence") {
      const currentStep = settings.sequenceSteps[settings.currentStepIndex];
      if (currentStep && currentStep.type === "fixed") {
        winnerOverride = currentStep.winnerName;
      }
    } else {
      winnerOverride = settings.forcedWinner;
    }

    wheelRef.current?.spin(winnerOverride);
  };

  const handleSpinEnd = async (winningSegment: WheelSegment) => {
    setWinner(winningSegment);

    if (wheelId) {
      const spinIndex =
        settings.mode === "sequence" ? settings.currentStepIndex : 0;
      try {
        await adminService.saveWheelSpin(wheelId, {
          spinIndex,
          winnerName: winningSegment.text,
        });
      } catch (err) {
        console.error("Failed to save spin", err);
      }
    }

    if (settings.mode === "sequence") {
      if (settings.currentStepIndex < settings.sequenceSteps.length - 1) {
        setSettings((prev) => ({
          ...prev,
          currentStepIndex: prev.currentStepIndex + 1,
        }));
      }
    }
  };

  const handleWinnerModalClose = () => {
    setWinner(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        Caricamento...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        {error}
      </div>
    );
  }

  if (!wheel) return null;

  const currentThemeStyles = THEMES[settings.theme];

  let statusText = "";
  if (settings.mode === "sequence") {
    statusText = `SPIN ${settings.currentStepIndex + 1} / ${settings.sequenceSteps.length}`;
    if (settings.currentStepIndex >= settings.sequenceSteps.length)
      statusText = "FINISHED";
  }

  return (
    <div
      className={`flex min-h-screen w-full flex-col items-center justify-center p-4 transition-colors duration-700 ${currentThemeStyles.background}`}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-[600px] w-[600px] animate-pulse rounded-full bg-blue-600 opacity-20 mix-blend-screen blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] animate-pulse rounded-full bg-purple-600 opacity-20 mix-blend-screen blur-[120px]"></div>
      </div>

      <header className="relative z-10 mb-4 text-center md:mb-8">
        <h1
          className={`text-4xl font-black uppercase tracking-tighter md:text-6xl ${currentThemeStyles.accent} drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]`}
        >
          {wheel.title}
        </h1>
        {settings.mode === "sequence" && (
          <div className="mt-2 inline-block animate-pulse rounded-full border border-purple-500 bg-purple-900/50 px-4 py-1 text-sm font-bold text-purple-200">
            MODE: SEQUENCE ({statusText})
          </div>
        )}
      </header>

      <main className="z-10 flex w-full flex-col items-center">
        <Wheel
          ref={wheelRef}
          segments={segments}
          theme={settings.theme}
          soundEnabled={settings.soundEnabled}
          forcedWinner={settings.forcedWinner}
          onSpinEnd={handleSpinEnd}
          isSpinning={isSpinning}
          setIsSpinning={setIsSpinning}
        />
        <Controls
          onSpin={handleSpinStart}
          isSpinning={isSpinning}
          settings={settings}
          winner={winner?.text || null}
        />
      </main>

      <WinnerModal winner={winner} onClose={handleWinnerModalClose} />
    </div>
  );
}
