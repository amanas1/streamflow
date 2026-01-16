
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
  // Fix: Added lastSeen property to UserProfile interface to support presence tracking
  lastSeen?: number;
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
  image?: string; // Compatibility alias
  audioBase64?: string; // Stored in RAM only
  timestamp: number;
  expiresAt?: number; // RAM deletion time
  isSystem?: boolean;
  cost?: number; // Credit cost
  read?: boolean;
}

export interface ChatSession {
  id: string; 
  participants: string[]; 
  lastActivity: number;
  updatedAt?: number;
  lastMessage?: ChatMessage | null;
}

export interface ChatRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
  cost?: number; 
}

// Add export keyword for these interfaces
export interface Track {
  id: string;
  title: string;
  artist: string;
  audioUrl: string; 
  coverUrl: string; 
  duration: number; 
  tags: string[];
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

export interface PassportData {
  countriesVisited: string[];
  totalListeningMinutes: number;
  nightListeningMinutes: number;
  stationsFavorited: number;
  unlockedAchievements: string[];
  level: number;
}

export interface Achievement {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  condition: (data: PassportData) => boolean;
}

export interface BottleMessage {
  id: string;
  text: string;
  senderName: string;
  senderCountry: string;
  timestamp: number;
  isFound: boolean;
}

export interface AlarmConfig {
  enabled: boolean;
  time: string; 
  days: number[]; 
}
