export interface WheelSegment {
  id: string;
  text: string;
  color: string;
  textColor: string;
}

export type ThemeName = 'base' | 'neon' | 'gold' | 'party';

export interface SequenceStep {
  id?: string;
  type: 'random' | 'fixed';
  winnerName: string | null;
}

export interface AppSettings {
  theme: ThemeName;
  soundEnabled: boolean;
  // Single spin mode manual override
  forcedWinner: string | null;
  // Sequence Mode
  mode: 'single' | 'sequence';
  sequenceSteps: SequenceStep[];
  currentStepIndex: number;
}

export const THEMES: Record<ThemeName, {
  background: string;
  wheelBorder: string;
  indicator: string;
  button: string;
  buttonText: string;
  accent: string;
  glowColor: string;
  centerGradient: string;
  centerBorder: string;
  colors: string[]; // Palette for segments
}> = {
  base: {
    background: 'bg-slate-900',
    wheelBorder: 'border-blue-500',
    indicator: 'text-red-500',
    button: 'bg-gradient-to-r from-blue-600 to-purple-600',
    buttonText: 'text-white',
    accent: 'text-blue-400',
    glowColor: 'rgba(59,130,246,0.6)',
    centerGradient: 'bg-gradient-to-br from-slate-100 to-slate-300',
    centerBorder: 'border-slate-400',
    colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1']
  },
  neon: {
    background: 'bg-black',
    wheelBorder: 'border-green-400',
    indicator: 'text-pink-500',
    button: 'bg-gradient-to-r from-green-400 to-cyan-500',
    buttonText: 'text-black',
    accent: 'text-green-400',
    glowColor: 'rgba(74,222,128,0.7)',
    centerGradient: 'bg-gradient-to-br from-green-300 to-cyan-400',
    centerBorder: 'border-green-200',
    colors: ['#00ff00', '#00ffff', '#ff00ff', '#ffff00', '#1a1a1a', '#ffffff']
  },
  gold: {
    background: 'bg-neutral-900',
    wheelBorder: 'border-yellow-500',
    indicator: 'text-yellow-300',
    button: 'bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700',
    buttonText: 'text-black',
    accent: 'text-yellow-400',
    glowColor: 'rgba(234,179,8,0.6)',
    centerGradient: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600',
    centerBorder: 'border-yellow-300',
    colors: ['#ffd700', '#111111', '#b8860b', '#333333', '#daa520', '#000000']
  },
  party: {
    background: 'bg-slate-800',
    wheelBorder: 'border-white',
    indicator: 'text-slate-900',
    button: 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500',
    buttonText: 'text-white',
    accent: 'text-yellow-400',
    glowColor: 'rgba(236,72,153,0.6)',
    centerGradient: 'bg-gradient-to-br from-pink-400 via-red-400 to-yellow-400',
    centerBorder: 'border-white',
    // Partecify-like vibrant colors
    colors: ['#FF4136', '#0074D9', '#2ECC40', '#FFDC00', '#B10DC9', '#FF851B', '#39CCCC', '#F012BE']
  }
};
