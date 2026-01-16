
export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  type?: 'genre' | 'era' | 'mood' | 'effect';
  description?: string;
}

export type ViewMode = 'genres' | 'eras' | 'moods' | 'effects' | 'favorites'; 

export type VisualizerVariant = 'segmented' | 'rainbow-lines' | 'galaxy' | 'mixed-rings' | 'bubbles' | 'stage-dancer' | 'trio-dancers' | 'viz-journey';

export type VisualMode = 'high' | 'medium' | 'low';

export interface VisualizerSettings {
  scaleX: number;
  scaleY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  opacity: number;
  speed: number;
  autoIdle: boolean;
  performanceMode: boolean;
  danceArmIntensity?: number;
  danceLegIntensity?: number;
  danceHeadIntensity?: number;
  fpsLimit?: boolean;
  isDisabled?: boolean;
  energySaver: boolean;
}

export interface FxSettings {
  reverb: number; 
  speed: number; 
}

export interface AudioProcessSettings {
  compressorEnabled: boolean;
  compressorThreshold: number;
  compressorRatio: number;
  bassBoost: number;
  loudness: number;
}

export type ThemeName = 'default' | 'emerald' | 'midnight' | 'cyber' | 'volcano' | 'ocean' | 'sakura' | 'gold' | 'frost' | 'forest';
export type BaseTheme = 'dark' | 'light' | 'auto';
export type Language = 'en' | 'ru';

// --- UPDATED USER PROFILE ---
export interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  credits: number; // Wallet Balance
  isAnonymous: boolean;
  age: number;
  country: string;
  city: string;
  gender: 'male' | 'female' | 'other';
  status: 'online' | 'offline';
  safetyLevel: 'green' | 'yellow' | 'red';
  blockedUsers: string[];
  bio: string;
  hasAgreedToRules: boolean;
  isAuthenticated?: boolean;
  email?: string;
  filters: {
    minAge: number;
    maxAge: number;
    countries: string[];
    languages: string[];
    genders: (string | 'any')[];
    soundEnabled: boolean;
  };
}

// --- EPHEMERAL CHAT TYPES ---
export interface ChatMessage {
  id: string;
  sessionId: string; 
  senderId: string;
  text?: string;
  imageBase64?: string; // Stored in RAM only
  audioBase64?: string; // Stored in RAM only
  timestamp: number;
  expiresAt: number; // RAM deletion time
  isSystem?: boolean;
  cost?: number; // Credit cost
}

export interface ChatSession {
  id: string; 
  participants: string[]; 
  lastActivity: number;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
  cost: number; 
}

export interface AmbienceState {
  rainVolume: number;
  rainVariant: 'soft' | 'roof'; 
  fireVolume: number;
  cityVolume: number;
  vinylVolume: number;
  is8DEnabled: boolean;
  spatialSpeed: number; 
}

export interface AlarmConfig {
  enabled: boolean;
  time: string; 
  days: number[]; 
}
