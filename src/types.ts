
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
  energySaver: boolean;
  // Fix: Added missing property fpsLimit
  fpsLimit?: boolean;
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

// Fix: Added missing exported member AmbienceState
export interface AmbienceState {
  rainVolume: number;
  rainVariant: 'soft' | 'roof'; 
  fireVolume: number;
  cityVolume: number;
  vinylVolume: number;
  is8DEnabled: boolean;
  spatialSpeed: number; 
}

// Fix: Added missing exported member AlarmConfig
export interface AlarmConfig {
  enabled: boolean;
  time: string; 
  days: number[]; 
}

// Fix: Added missing exported member PassportData
export interface PassportData {
  countriesVisited: string[];
  totalListeningMinutes: number;
  nightListeningMinutes: number;
  stationsFavorited: number;
  unlockedAchievements: string[];
  level: number;
}

// Fix: Added missing exported member Achievement
export interface Achievement {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  condition: (data: PassportData) => boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string | null;
  age: number;
  country: string;
  city: string;
  gender: 'male' | 'female' | 'other';
  status: 'online' | 'offline';
  lastSeen?: number;
  safetyLevel: 'green' | 'yellow' | 'red';
  blockedUsers: string[];
  bio: string;
  hasAgreedToRules: boolean;
  isAuthenticated?: boolean;
  email?: string;
  // Fix: Added missing properties credits, isAnonymous, and filters
  credits?: number;
  isAnonymous?: boolean;
  filters?: {
    minAge: number;
    maxAge: number;
    countries: string[];
    languages: string[];
    genders: (string | 'any')[];
    soundEnabled: boolean;
  };
}

export interface ChatMessage {
  id: string;
  sessionId: string; 
  senderId: string;
  text?: string;
  audioBase64?: string;
  timestamp: number;
  read: boolean;
}

export interface ChatSession {
  id: string; 
  participants: string[]; 
  lastMessage: ChatMessage | null;
  createdAt: number;
  updatedAt: number;
}
