"use client";

import React from 'react';
import { AppSettings, ThemeName, WheelSegment, SequenceStep } from './types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => void;
  segments: WheelSegment[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  updateSettings,
  segments
}) => {
  if (!isOpen) return null;

  // Helper to update sequence steps
  const updateSequenceStep = (index: number, field: keyof SequenceStep, value: any) => {
    const newSteps = [...settings.sequenceSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    // If switching to random, clear winner name
    if (field === 'type' && value === 'random') {
       newSteps[index].winnerName = null;
    }
    updateSettings({ ...settings, sequenceSteps: newSteps });
  };

  const setSequenceLength = (length: number) => {
    if (length < 1) return;
    const currentLength = settings.sequenceSteps.length;
    let newSteps = [...settings.sequenceSteps];

    if (length > currentLength) {
      // Add steps
      for (let i = 0; i < length - currentLength; i++) {
        newSteps.push({
           id: `step-${Date.now()}-${i}`,
           type: 'random',
           winnerName: null
        });
      }
    } else {
      // Remove steps
      newSteps = newSteps.slice(0, length);
    }
    updateSettings({ ...settings, sequenceSteps: newSteps });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto flex flex-col">

        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-white">Configurazione</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>

        <div className="space-y-8 flex-1">

          {/* Mode Selection */}
          <div className="bg-slate-800 p-4 rounded-xl">
             <label className="block text-sm font-medium text-slate-400 mb-3">Modalita di Gioco</label>
             <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ ...settings, mode: 'single' })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${settings.mode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400'}`}
                >
                  Singolo Spin
                </button>
                <button
                  onClick={() => updateSettings({ ...settings, mode: 'sequence' })}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${settings.mode === 'sequence' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400'}`}
                >
                  Sequenza (Multi-Spin)
                </button>
             </div>
          </div>

          {/* SINGLE MODE SETTINGS */}
          {settings.mode === 'single' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                   <label className="block text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                       <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                     </svg>
                     Vincitore Forzato (Rigging)
                   </label>
                   <select
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                     value={settings.forcedWinner || ''}
                     onChange={(e) => updateSettings({ ...settings, forcedWinner: e.target.value || null })}
                   >
                     <option value="">-- Casuale (Fair Play) --</option>
                     {segments.map(seg => (
                       <option key={seg.id} value={seg.text}>{seg.text}</option>
                     ))}
                   </select>
                </div>
             </div>
          )}

          {/* SEQUENCE MODE SETTINGS */}
          {settings.mode === 'sequence' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">Numero di Spin</label>
                  <div className="flex items-center gap-3 bg-slate-800 rounded-lg p-1">
                     <button onClick={() => setSequenceLength(settings.sequenceSteps.length - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white">-</button>
                     <span className="font-mono font-bold w-6 text-center">{settings.sequenceSteps.length}</span>
                     <button onClick={() => setSequenceLength(settings.sequenceSteps.length + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded text-white">+</button>
                  </div>
               </div>

               <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {settings.sequenceSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                       <span className="text-xs font-mono text-slate-500 w-6">#{idx + 1}</span>

                       <select
                          value={step.type}
                          onChange={(e) => updateSequenceStep(idx, 'type', e.target.value)}
                          className="bg-slate-900 border border-slate-600 text-xs rounded p-2 text-white"
                       >
                          <option value="random">Casuale</option>
                          <option value="fixed">Vincitore</option>
                       </select>

                       {step.type === 'fixed' ? (
                          <select
                             value={step.winnerName || ''}
                             onChange={(e) => updateSequenceStep(idx, 'winnerName', e.target.value)}
                             className="flex-1 bg-slate-900 border border-slate-600 text-xs rounded p-2 text-white"
                          >
                             <option value="">Seleziona...</option>
                             {segments.map(s => <option key={s.id} value={s.text}>{s.text}</option>)}
                          </select>
                       ) : (
                          <div className="flex-1 text-xs text-slate-500 italic px-2">Risultato casuale</div>
                       )}
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="border-t border-slate-800 my-4"></div>

          {/* Theme & Audio */}
          <div className="grid grid-cols-1 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Tema Colori</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(['base', 'neon', 'gold', 'party'] as ThemeName[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSettings({ ...settings, theme: t })}
                      className={`px-3 py-1.5 rounded-full border capitalize text-xs font-bold whitespace-nowrap ${
                        settings.theme === t
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
             </div>

             <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                <span className="text-sm font-medium text-slate-300">Effetti Sonori</span>
                <button
                  onClick={() => updateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                  <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
             </div>
          </div>

        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold shadow-lg transition-all"
          >
            Salva Impostazioni
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
