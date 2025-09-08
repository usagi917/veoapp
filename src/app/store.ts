import { create } from 'zustand';

export type VoiceGender = 'female' | 'male' | 'other';
export type VoiceTone = 'slow' | 'normal' | 'energetic';
export type Motion = 'neutral' | 'smile' | 'energetic' | 'serene' | 'nod';

export type AppState = {
  microPan: boolean;
  voiceGender: VoiceGender;
  voiceTone: VoiceTone;
  motion: Motion;
  // 必要に応じて追加（スクリプト/同意/長さ など）
  setMicroPan: (v: boolean) => void;
  setVoiceGender: (v: VoiceGender) => void;
  setVoiceTone: (v: VoiceTone) => void;
  setMotion: (v: Motion) => void;
};

export const useAppStore = create<AppState>((set) => ({
  microPan: false,
  voiceGender: 'female',
  voiceTone: 'normal',
  motion: 'neutral',
  setMicroPan: (v) => set({ microPan: v }),
  setVoiceGender: (v) => set({ voiceGender: v }),
  setVoiceTone: (v) => set({ voiceTone: v }),
  setMotion: (v) => set({ motion: v }),
}));
