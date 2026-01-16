
import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { RadioStation, CategoryInfo, ViewMode, ThemeName, BaseTheme, Language, UserProfile, VisualizerVariant, VisualizerSettings, AmbienceState, AlarmConfig, FxSettings, AudioProcessSettings } from './types';
import { GENRES, ERAS, MOODS, EFFECTS, DEFAULT_VOLUME, TRANSLATIONS, NEWS_MESSAGES } from './constants';
import { fetchStationsByTag, fetchStationsByUuids } from './services/radioService';
import { curateStationList, isAiAvailable } from './services/geminiService';
import AudioVisualizer from './components/AudioVisualizer';
import DancingAvatar from './components/DancingAvatar';
import CosmicBackground from './components/CosmicBackground';
import RainEffect from './components/RainEffect';
import FireEffect from './components/FireEffect';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAudioChain } from './hooks/useAudioChain';
import { 
  PauseIcon, VolumeIcon, LoadingIcon, MusicNoteIcon, HeartIcon, MenuIcon, AdjustmentsIcon,
  PlayIcon, ChatBubbleIcon, NextIcon, PreviousIcon, MaximizeIcon, XMarkIcon, DownloadIcon,
  EnvelopeIcon, LifeBuoyIcon 
} from './components/Icons';

// --- LAZY LOADED BRANCHES ---
const ToolsPanel = React.lazy(() => import('./components/ToolsPanel'));
const ChatPanel = React.lazy(() => import('./components/ChatPanel'));
const ManualModal = React.lazy(() => import('./components/ManualModal'));
const TutorialOverlay = React.lazy(() => import('./components/TutorialOverlay'));
const ProfileSetup = React.lazy(() => import('./components/ProfileSetup'));
const DownloadAppModal = React.lazy(() => import('./components/DownloadAppModal'));
const FeedbackModal = React.lazy(() => import('./components/FeedbackModal'));

const THEME_COLORS: Record<ThemeName, { primary: string; secondary: string }> = {
  default: { primary: '#bc6ff1', secondary: '#f038ff' },
  emerald: { primary: '#00ff9f', secondary: '#00b8ff' },
  midnight: { primary: '#4d4dff', secondary: '#a64dff' },
  cyber: { primary: '#ff00ff', secondary: '#00ffff' },
  volcano: { primary: '#ff3c00', secondary: '#ffcc00' },
  ocean: { primary: '#00d2ff', secondary: '#3a7bd5' },
  sakura: { primary: '#ff758c', secondary: '#ff7eb3' },
  gold: { primary: '#ffcc33', secondary: '#cc9900' },
  frost: { primary: '#74ebd5', secondary: '#acb6e5' },
  forest: { primary: '#a8ff78', secondary: '#78ffd6' },
};

const DEFAULT_VIZ_SETTINGS: VisualizerSettings = {
  scaleX: 1.0, scaleY: 1.0, brightness: 100, contrast: 100, saturation: 100, hue: 0, opacity: 1.0, speed: 1.0, autoIdle: true, performanceMode: true, energySaver: false
};

const INITIAL_CHUNK = 5; 
const TRICKLE_STEP = 5;
const AUTO_TRICKLE_LIMIT = 15;
const PAGE_SIZE = 10;

// Ambience URLs
const AMBIENCE_URLS = {
    rain_soft: 'https://soundbible.com/mp3/Rain_Background-Mike_Koenig-1681389445.mp3',
    rain_roof: 'https://soundbible.com/mp3/Rain_Background-Mike_Koenig-1681389445.mp3',
    fire: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b33d06b38.mp3', 
    city: 'https://soundbible.com/mp3/City_Traffic-Sound_Explorer-1662968325.mp3',
    vinyl: 'https://cdn.pixabay.com/audio/2022/02/07/audio_6527581fb9.mp3' 
};

// Toast Notification Type
interface Toast {
    message: string;
    type: 'info' | 'error' | 'success';
    id: number;
}

const StationCard = React.memo(({ 
  station, isSelected, isFavorite, onPlay, onToggleFavorite, index 
}: { 
  station: RadioStation; isSelected: boolean; isFavorite: boolean; 
  onPlay: (s: RadioStation) => void; onToggleFavorite: (id: string) => void; index: number;
}) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div 
      onClick={() => onPlay(station)} 
      className={`group relative rounded-[2rem] p-5 cursor-pointer transition-all border-2 animate-in fade-in slide-in-from-bottom-3 duration-500 ${isSelected ? 'bg-[var(--selected-item-bg)] border-primary shadow-2xl shadow-primary/20 scale-[1.02]' : 'glass-card border-[var(--panel-border)] hover:border-white/20 hover:bg-white/5'}`}
      style={{ animationDelay: `${(index % 5) * 50}ms` }}
    >
      <div className="flex justify-between mb-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden bg-slate-800/50 relative shadow-inner">
          {!imgLoaded && !imgError && <div className="absolute inset-0 skeleton-loader" />}
          {station.favicon && !imgError ? (
            <img src={station.favicon} loading="lazy" onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} className={`w-full h-full object-cover transition-all duration-500 ${imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`} />
          ) : (
            <MusicNoteIcon className="w-6 h-6 text-slate-600" />
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(station.stationuuid); }} className={`p-2 rounded-full transition-all active:scale-150 ${isFavorite ? 'text-secondary bg-secondary/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
          <HeartIcon className="w-5 h-5" filled={isFavorite} />
        </button>
      </div>
      <h3 className="font-bold truncate text-[var(--text-base)] text-sm group-hover:text-primary transition-colors">{station.name}</h3>
      <p className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-widest truncate">{station.tags || 'Music'} • {station.bitrate || 128}K</p>
    </div>
  );
});

const AppContent: React.FC = () => {
  // Radio State
  const [viewMode, setViewMode] = useState<ViewMode>('genres');
  const [selectedCategory, setSelectedCategory] = useState<CategoryInfo | null>(GENRES[0]);
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_CHUNK);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  
  // AI State
  const [isAiCurating, setIsAiCurating] = useState(false);
  const [aiNotification, setAiNotification] = useState<string | null>(null);
  
  // Common Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  
  // UI State
  const [toolsOpen, setToolsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false); 
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [highlightFeature, setHighlightFeature] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

  const [sleepTimer, setSleepTimer] = useState<number | null>(null); 
  const [eqGains, setEqGains] = useState<number[]>(new Array(10).fill(0));
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');
  const [baseTheme, setBaseTheme] = useState<BaseTheme>('dark');
  const [customCardColor, setCustomCardColor] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('ru');
  const [visualizerVariant, setVisualizerVariant] = useState<VisualizerVariant>('galaxy');
  const [vizSettings, setVizSettings] = useState<VisualizerSettings>(DEFAULT_VIZ_SETTINGS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isIdleView, setIsIdleView] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showDeveloperNews, setShowDeveloperNews] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);

  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [fxSettings, setFxSettings] = useState<FxSettings>({ reverb: 0, speed: 1.0 });
  const [toasts, setToasts] = useState<Toast[]>([]); // Added Toasts State
  
  const [audioEnhancements, setAudioEnhancements] = useState<AudioProcessSettings>({
      compressorEnabled: false,
      compressorThreshold: -24,
      compressorRatio: 12,
      bassBoost: 0,
      loudness: 0
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('streamflow_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: `guest_${Date.now()}`,
      name: 'Guest',
      avatar: null,
      credits: 0,
      isAnonymous: true,
      age: 18,
      country: 'USA',
      city: 'New York',
      gender: 'other',
      status: 'online',
      safetyLevel: 'green',
      blockedUsers: [],
      bio: '',
      hasAgreedToRules: false,
      filters: { minAge: 18, maxAge: 99, countries: [], languages: [], genders: ['any'], soundEnabled: true }
    };
  });
  
  const [ambience, setAmbience] = useState<AmbienceState>({ 
      rainVolume: 0, rainVariant: 'soft', fireVolume: 0, cityVolume: 0, vinylVolume: 0, is8DEnabled: false, spatialSpeed: 1 
  });
  const [alarm, setAlarm] = useState<AlarmConfig>({ enabled: false, time: '08:00', days: [1,2,3,4,5] });

  const audioRef = useRef<HTMLAudioElement>(null);
  const ambienceRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const pannerIntervalRef = useRef<number | null>(null);
  const loadRequestIdRef = useRef<number>(0);
  const sleepIntervalRef = useRef<number | null>(null);
  const trickleTimerRef = useRef<number | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // --- AUDIO CHAIN HOOK ---
  const { analyserNode, pannerNode, initAudio, resumeContext } = useAudioChain(audioRef, fxSettings, eqGains);

  const t = TRANSLATIONS[language];

  // Helper: Toast Notification
  const showToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
      const id = Date.now();
      setToasts(prev => [...prev, { message, type, id }]);
      setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
  }, []);

  const visualMode = useMemo(() => {
      if (vizSettings.energySaver) return 'low';
      if (vizSettings.performanceMode) return 'medium';
      return 'high';
  }, [vizSettings.energySaver, vizSettings.performanceMode]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Audio Lifecycle
  const handlePlayStation = useCallback((station: RadioStation) => {
    // 1. Init Audio Graph (Only once)
    initAudio();
    // 2. Ensure context is running (Unlock autoplay)
    resumeContext();
    
    setCurrentStation(station);
    setIsPlaying(true);
    setIsBuffering(true);
    
    if (audioRef.current) {
        audioRef.current.src = station.url_resolved;
        audioRef.current.crossOrigin = "anonymous";
        audioRef.current.playbackRate = fxSettings.speed; 
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Playback failed:", error);
                setIsPlaying(false);
                setIsBuffering(false);
                showToast(language === 'ru' ? 'Ошибка воспроизведения потока' : 'Stream connection failed', 'error');
            });
        }
    }
  }, [initAudio, resumeContext, fxSettings.speed, language, showToast]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (!currentStation) {
        if (stations.length) handlePlayStation(stations[0]);
        return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      resumeContext();
      audioRef.current.play().catch(e => {
          showToast(language === 'ru' ? 'Не удалось возобновить' : 'Could not resume playback', 'error');
      });
      setIsPlaying(true);
    }
  };

  // Sleep Timer
  useEffect(() => {
    if (sleepTimer !== null && sleepTimer > 0) {
      sleepIntervalRef.current = window.setInterval(() => {
        setSleepTimer((prev) => {
          if (prev !== null && prev > 0) {
            const next = prev - 1;
            if (next <= 0) {
              setIsPlaying(false);
              if (audioRef.current) audioRef.current.pause();
              showToast(language === 'ru' ? 'Таймер сна завершен' : 'Sleep timer finished', 'info');
              return null;
            }
            return next;
          }
          return null;
        });
      }, 60000); 
    } else {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    }
    return () => { if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); };
  }, [sleepTimer, language, showToast]);

  // Alarm Check
  useEffect(() => {
    const checkAlarm = setInterval(() => {
      if (alarm.enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const currentDay = now.getDay();
        
        if (currentTime === alarm.time && alarm.days.includes(currentDay)) {
           if (!isPlaying && stations.length > 0) {
             handlePlayStation(currentStation || stations[0]);
             showToast(language === 'ru' ? 'Будильник сработал!' : 'Alarm activated!', 'success');
           }
        }
      }
    }, 1000);
    return () => clearInterval(checkAlarm);
  }, [alarm, isPlaying, currentStation, stations, handlePlayStation, language, showToast]);

  // Ambience Logic (Excluded from major refactor, but kept stable)
  useEffect(() => {
      ['rain', 'fire', 'city', 'vinyl'].forEach(key => {
          let url = '';
          if (key === 'rain') {
              url = ambience.rainVariant === 'roof' ? AMBIENCE_URLS.rain_roof : AMBIENCE_URLS.rain_soft;
          } else {
              url = (AMBIENCE_URLS as any)[key];
          }
          let el = ambienceRefs.current[key];
          if (!el) { 
              el = new Audio(); 
              el.loop = true; 
              el.preload = "auto";
              if (url.startsWith('http')) { el.crossOrigin = "anonymous"; }
              ambienceRefs.current[key] = el; 
          } 
          
          const assignedUrl = (el as any)._assignedUrl;
          if (assignedUrl !== url) {
              el.src = url;
              (el as any)._assignedUrl = url;
              if ((ambience as any)[`${key}Volume`] > 0) {
                  el.play().catch(() => {});
              }
          }
          
          const vol = (ambience as any)[`${key}Volume`]; 
          if (Math.abs(el.volume - vol) > 0.005) {
              el.volume = vol;
          }
          
          if (vol > 0 && el.paused) {
              el.play().catch(() => {});
          } else if (vol === 0 && !el.paused) {
              el.pause();
          }
      });
  }, [ambience.rainVolume, ambience.rainVariant, ambience.fireVolume, ambience.cityVolume, ambience.vinylVolume]);

  // Spatial Audio Panner Logic
  useEffect(() => {
    if (ambience.is8DEnabled) {
        let angle = 0;
        if (pannerIntervalRef.current) clearInterval(pannerIntervalRef.current);
        pannerIntervalRef.current = window.setInterval(() => {
           if (pannerNode) { angle += 0.02 * ambience.spatialSpeed; pannerNode.pan.value = Math.sin(angle); }
        }, 30);
    } else {
        if (pannerIntervalRef.current) clearInterval(pannerIntervalRef.current);
        if (pannerNode) pannerNode.pan.value = 0;
    }
    return () => { if (pannerIntervalRef.current) clearInterval(pannerIntervalRef.current); };
  }, [ambience.is8DEnabled, ambience.spatialSpeed, pannerNode]);

  // Volume Sync
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  
  // Theme Application
  useEffect(() => {
    if (baseTheme === 'light') { document.body.classList.add('light-mode'); } else { document.body.classList.remove('light-mode'); }
    const colors = THEME_COLORS[currentTheme];
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    if (customCardColor) {
        const opacity = baseTheme === 'light' ? 0.9 : 0.20; 
        const panelOpacity = baseTheme === 'light' ? 0.98 : 0.25; 
        const inputOpacity = baseTheme === 'light' ? 0.3 : 0.15;
        const borderOpacity = 0.2;
        root.style.setProperty('--card-bg', `rgba(${customCardColor}, ${opacity})`);
        root.style.setProperty('--panel-bg', `rgba(${customCardColor}, ${panelOpacity})`);
        root.style.setProperty('--input-bg', `rgba(${customCardColor}, ${inputOpacity})`);
        root.style.setProperty('--card-border', `rgba(${customCardColor}, ${borderOpacity})`);
        root.style.setProperty('--panel-border', `rgba(${customCardColor}, ${borderOpacity})`);
    } else {
        root.style.removeProperty('--card-bg'); root.style.removeProperty('--panel-bg'); root.style.removeProperty('--input-bg'); root.style.removeProperty('--card-border'); root.style.removeProperty('--panel-border');
    }
  }, [currentTheme, baseTheme, customCardColor]);

  // Station Loading Logic
  const loadCategory = useCallback(async (category: CategoryInfo | null, mode: ViewMode, autoPlay: boolean = false) => { 
    const requestId = Date.now();
    loadRequestIdRef.current = requestId;
    setViewMode(mode); setSelectedCategory(category); setIsLoading(true); if (window.innerWidth < 768) setSidebarOpen(false); setVisibleCount(INITIAL_CHUNK); setStations([]);
    setIsAiCurating(false); 
    
    try {
      if (mode === 'favorites') {
        const savedFavs = localStorage.getItem('streamflow_favorites');
        const favUuids = savedFavs ? JSON.parse(savedFavs) : [];
        const data = favUuids.length ? await fetchStationsByUuids(favUuids) : [];
        if (loadRequestIdRef.current === requestId) { setStations(data); setIsLoading(false); if (data.length > 0 && autoPlay) handlePlayStation(data[0]); }
      } else if (category) {
        const fastData = await fetchStationsByTag(category.id, 10);
        if (loadRequestIdRef.current === requestId) { setStations(fastData); setIsLoading(false); if (fastData.length > 0 && autoPlay) handlePlayStation(fastData[0]); }
        let fetchLimit = 50; 
        if (category.id === 'classical') { fetchLimit = 100; } else if (category.id === 'islamic' || category.id === 'muslim') { fetchLimit = 3; }
        fetchStationsByTag(category.id, fetchLimit).then(fullData => { 
            if (loadRequestIdRef.current === requestId && fullData.length > 0) setStations(fullData); 
        }).catch(() => {});
      }
    } catch (e) { 
        if (loadRequestIdRef.current === requestId) {
            setIsLoading(false); 
            showToast(language === 'ru' ? 'Ошибка загрузки станций' : 'Failed to load stations', 'error');
        }
    }
  }, [handlePlayStation, language, showToast]);

  useEffect(() => { loadCategory(GENRES[0], 'genres', false); }, [loadCategory]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(p => { const n = p.includes(id) ? p.filter(fid => fid !== id) : [...p, id]; localStorage.setItem('streamflow_favorites', JSON.stringify(n)); return n; });
  }, []);
  
  const handleToggleDevNews = useCallback((val: boolean) => { setShowDeveloperNews(val); }, []);

  const handleProfileComplete = (profile: UserProfile) => {
    setCurrentUser(profile); localStorage.setItem('streamflow_user_profile', JSON.stringify(profile)); setShowProfileSetup(false);
  };

  const handleAiCuration = async () => {
      if (!selectedCategory || isAiCurating || stations.length === 0) return;
      
      setIsAiCurating(true);
      const msg = language === 'ru' 
        ? "Подождите, идет оптимизация станций по вашему вкусу..." 
        : "Please wait, AI is optimizing the station list for you...";
      setAiNotification(msg);

      try {
          const keptIds = await curateStationList(stations, selectedCategory.name, selectedCategory.description || '');
          const filteredStations = stations.filter(s => keptIds.includes(s.stationuuid));
          setStations(filteredStations);
          setVisibleCount(Math.min(INITIAL_CHUNK, filteredStations.length));
      } catch (e) {
          console.error("AI Curation failed");
      } finally {
          setIsAiCurating(false);
          setTimeout(() => setAiNotification(null), 3000);
      }
  };

  const handleShowFeature = (featureId: string) => {
      setManualOpen(false);
      setHighlightFeature(featureId);
  };
  
  // Handlers for Player Controls
  const handleNextStation = useCallback(() => {
      if (!stations.length) return;
      const currentIndex = currentStation ? stations.findIndex(s => s.stationuuid === currentStation.stationuuid) : -1;
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % stations.length;
      handlePlayStation(stations[nextIndex]);
  }, [stations, currentStation, handlePlayStation]);

  const handlePreviousStation = useCallback(() => {
      if (!stations.length) return;
      const currentIndex = currentStation ? stations.findIndex(s => s.stationuuid === currentStation.stationuuid) : -1;
      const prevIndex = currentIndex === -1 ? stations.length - 1 : (currentIndex - 1 + stations.length) % stations.length;
      handlePlayStation(stations[prevIndex]);
  }, [stations, currentStation, handlePlayStation]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !isLoading && stations.length > visibleCount) {
                setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, stations.length));
            }
        },
        { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [isLoading, stations.length, visibleCount]);

  const visibleStations = useMemo(() => stations.slice(0, visibleCount), [stations, visibleCount]);
  const currentNewsList = NEWS_MESSAGES[language] || NEWS_MESSAGES.en;
  const currentNews = currentNewsList[newsIndex % currentNewsList.length];

  return (
    <div className={`relative flex h-screen font-sans overflow-hidden bg-[var(--base-bg)] text-[var(--text-base)] transition-all duration-700`}>
      <RainEffect intensity={ambience.rainVolume} />
      <FireEffect intensity={ambience.fireVolume} />
      
      {/* Hidden Audio Element */}
      <audio 
          ref={audioRef} 
          onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }} 
          onPause={() => setIsPlaying(false)} 
          onWaiting={() => setIsBuffering(true)} 
          onEnded={() => { if (audioRef.current) { audioRef.current.load(); audioRef.current.play().catch(() => {}); } }} 
          onError={() => { setIsPlaying(false); setIsBuffering(false); showToast('Stream connection lost', 'error'); }}
          crossOrigin="anonymous" 
      />
      
      {/* Toast Notifications */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
          {toasts.map(toast => (
              <div key={toast.id} className={`bg-slate-900/90 backdrop-blur-md border px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-2 fade-in duration-300 ${toast.type === 'error' ? 'border-red-500/50 text-red-200' : toast.type === 'success' ? 'border-green-500/50 text-green-200' : 'border-primary/50 text-white'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-primary'}`} />
                  <span className="text-xs font-bold tracking-wide shadow-black drop-shadow-md">{toast.message}</span>
              </div>
          ))}
      </div>

      {aiNotification && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 fade-in duration-300">
              <div className="bg-slate-900/90 backdrop-blur-md border border-primary/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping" />
                  <span className="text-xs font-bold tracking-wide shadow-black drop-shadow-md">{aiNotification}</span>
              </div>
          </div>
      )}

      {showDeveloperNews && (
          <div className={`absolute top-0 left-0 right-0 z-[60] bg-gradient-to-r from-primary/90 to-secondary/90 text-white py-1.5 overflow-hidden shadow-lg backdrop-blur-md transition-transform duration-500 ${isIdleView ? '-translate-y-full' : 'translate-y-0'}`}>
            <div 
              className="animate-marquee whitespace-nowrap text-[10px] font-black uppercase tracking-widest px-4"
              onAnimationIteration={() => setNewsIndex(i => i + 1)}
            >
                {currentNews}
            </div>
          </div>
      )}

      {(window.innerWidth < 768 && sidebarOpen) && ( <div className="fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} /> )}

      <aside className={`fixed inset-y-0 left-0 z-[70] w-72 transform transition-all duration-500 glass-panel flex flex-col bg-[var(--panel-bg)] ${isIdleView ? '-translate-x-full opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`p-6 flex items-center justify-between ${showDeveloperNews ? 'mt-6' : ''}`}>
           <div className="flex items-center gap-3"><h1 className="text-2xl font-black tracking-tighter">StreamFlow</h1><DancingAvatar isPlaying={isPlaying && !isBuffering} className="w-9 h-9" visualMode={visualMode} /></div>
           <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
        </div>
        <div className="px-4 pb-4 space-y-2 animate-in slide-in-from-left duration-300">
            <div className="flex bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--panel-border)] gap-1">
                {(['genres', 'eras', 'moods', 'effects'] as const).map(m => (
                    <button key={m} onClick={() => loadCategory(m === 'genres' ? GENRES[0] : m === 'eras' ? ERAS[0] : m === 'moods' ? MOODS[0] : EFFECTS[0], m, false)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${viewMode === m ? 'bg-[var(--selected-item-bg)] text-[var(--text-base)]' : 'text-slate-400'}`}>{t[m]}</button>
                ))}
            </div>
            <button onClick={() => loadCategory(null, 'favorites', false)} className={`w-full py-3 rounded-2xl text-xs font-black border transition-all ${viewMode === 'favorites' ? 'bg-secondary border-secondary text-white' : 'bg-[var(--input-bg)] text-slate-400'}`}>
                <HeartIcon className="w-4 h-4 inline mr-2" filled={viewMode === 'favorites'} /> {t.favorites}
            </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 no-scrollbar">
        {viewMode !== 'favorites' && (viewMode === 'genres' ? GENRES : viewMode === 'eras' ? ERAS : viewMode === 'moods' ? MOODS : EFFECTS).map((cat) => (
            <button key={cat.id} onClick={() => loadCategory(cat, viewMode, false)} className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all ${selectedCategory?.id === cat.id ? 'bg-[var(--selected-item-bg)] font-black' : 'text-slate-400 hover:text-[var(--text-base)]'}`}>
                {t[cat.id] || cat.name}
            </button>
        ))}
        </div>
        <div className="p-4 pt-2 border-t border-[var(--panel-border)]">
             <button onClick={() => setDownloadModalOpen(true)} className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 border border-white/5 hover:border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group">
                <DownloadIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                <div className="text-left"><p className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-white transition-colors">Mobile App</p><p className="text-xs font-black text-white">Download</p></div>
             </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 relative transition-all duration-500 ${sidebarOpen ? 'md:ml-72' : 'ml-0'} ${showDeveloperNews ? 'pt-8' : ''}`}>
        <header className={`h-20 flex items-center px-4 md:px-10 justify-between shrink-0 transition-all duration-500 z-10 ${isIdleView ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 text-[var(--text-base)] hover:text-primary transition-colors flex items-center justify-center"
              title={t.manualTooltip}
            >
              <MenuIcon className="w-7 h-7" />
            </button>
            
            <div className="hidden md:flex text-slate-400 text-sm font-medium tracking-wide items-center gap-2">
                {t.listeningTo} 
                <span className="text-[var(--text-base)] font-black uppercase tracking-widest ml-1">
                    {viewMode === 'favorites' ? t.favorites : (selectedCategory ? (t[selectedCategory.id] || selectedCategory.name) : '')}
                </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
              {isAiAvailable() && viewMode !== 'favorites' && !isLoading && (
                  <button 
                    onClick={handleAiCuration} 
                    disabled={isAiCurating}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${isAiCurating ? 'bg-primary/20 text-primary cursor-wait' : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-105 active:scale-95'}`}
                  >
                      {isAiCurating ? <LoadingIcon className="w-3 h-3 animate-spin" /> : <span className="text-sm">✨</span>}
                      <span className="hidden xs:inline">{isAiCurating ? 'Optimizing...' : 'AI Optimize'}</span>
                      {!isAiCurating && <span className="xs:hidden font-bold">AI</span>}
                  </button>
              )}
              <button onClick={() => setManualOpen(true)} className="p-2 text-slate-400 hover:text-white transition-transform hover:scale-110" title={t.manualTooltip}><LifeBuoyIcon className="w-6 h-6" /></button>
              <button onClick={() => setFeedbackOpen(true)} className="p-2 text-slate-400 hover:text-white transition-transform hover:scale-110" title={t.feedbackTitle}><EnvelopeIcon className="w-6 h-6" /></button>
            </div>
          </div>
          
          <div className="flex items-center shrink-0">
            {!chatOpen && (
                <div className="flex items-center gap-1 animate-pulse mr-1 md:mr-2">
                    <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-widest whitespace-nowrap">Super-chat</span>
                    <div className="text-primary text-xs">→</div> 
                </div>
            )}
            <button onClick={() => setChatOpen(!chatOpen)} className="p-2 rounded-full relative text-primary hover:scale-110 transition-transform"><ChatBubbleIcon className="w-6 h-6" /></button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto px-6 md:px-10 no-scrollbar transition-all duration-500 ${isIdleView ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <>
            {selectedCategory && viewMode !== 'favorites' && (
                <div className="mb-10 p-10 h-56 rounded-[2.5rem] glass-panel relative overflow-hidden flex flex-col justify-end">
                    <div className={`absolute inset-0 bg-gradient-to-r ${selectedCategory.color} opacity-20 mix-blend-overlay`}></div>
                    <div className="absolute inset-x-0 bottom-0 top-0 z-0 opacity-40"><AudioVisualizer analyserNode={analyserNode} isPlaying={isPlaying} variant={visualizerVariant} settings={vizSettings} visualMode={visualMode} /></div>
                    <div className="relative z-10 pointer-events-none hidden"><h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter uppercase">{t[selectedCategory.id] || selectedCategory.name}</h2></div>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 pb-32">
                {isLoading || isAiCurating ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-[1.2] rounded-[2rem] skeleton-loader"></div>) : (
                visibleStations.map((station, index) => (
                    <StationCard key={station.stationuuid} station={station} index={index} isSelected={currentStation?.stationuuid === station.stationuuid} isFavorite={favorites.includes(station.stationuuid)} onPlay={handlePlayStation} onToggleFavorite={toggleFavorite} />
                ))
                )}
            </div>
            {!isLoading && !isAiCurating && stations.length > visibleCount && (
                <div ref={loaderRef} className="h-20 flex items-center justify-center relative z-10 opacity-30 pb-32">
                    <div className="animate-pulse flex space-x-1"><div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div><div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div><div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div></div>
                </div>
            )}
            </>
        </div>

        {isIdleView && (
           <div className="fixed inset-0 z-0 animate-in fade-in duration-1000 bg-[#02040a]">
              <CosmicBackground />
              <div className="absolute inset-0 w-full h-full z-10">
                {!vizSettings.energySaver && (
                  <AudioVisualizer analyserNode={analyserNode} isPlaying={isPlaying} variant={visualizerVariant} settings={vizSettings} visualMode={visualMode} />
                )}
              </div>
           </div>
        )}

        <div className={`absolute bottom-8 left-0 right-0 px-4 md:px-10 transition-all duration-700 ease-in-out z-20 ${chatOpen ? 'md:pr-[420px] lg:pr-[470px]' : ''} ${isIdleView ? 'opacity-0 translate-y-20 scale-95 pointer-events-none' : 'opacity-100 translate-y-0 scale-100 pointer-events-auto'}`}>
           <div className={`pointer-events-auto max-w-5xl mx-auto rounded-[2.5rem] p-4 flex flex-col shadow-2xl border-2 border-[var(--panel-border)] transition-all duration-500 bg-[var(--player-bar-bg)]`}>
               <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0 z-10">
                        <DancingAvatar isPlaying={isPlaying && !isBuffering} className="w-12 h-12" visualMode={visualMode} />
                        <div className="min-w-0">
                            <h4 className="font-black text-sm md:text-base truncate">{currentStation?.name || 'Radio Stream'}</h4>
                            <p className="text-[10px] text-primary font-black uppercase tracking-widest">{isBuffering ? 'Buffering...' : 'LIVE'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6 z-10 mx-4">
                        <button onClick={handlePreviousStation} className="p-2 text-slate-400 hover:text-white transition-colors"><PreviousIcon className="w-6 h-6" /></button>
                        <button onClick={togglePlay} className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center bg-white text-black shadow-xl hover:scale-105 transition-all">
                            {isBuffering ? <LoadingIcon className="animate-spin w-6 h-6" /> : isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}
                        </button>
                        <button onClick={handleNextStation} className="p-2 text-slate-400 hover:text-white transition-colors"><NextIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 flex justify-end items-center gap-2 md:gap-5 z-10">
                        <button onClick={(e) => { e.stopPropagation(); setIsIdleView(true); }} className={`p-2.5 text-[var(--text-base)] hover:text-primary transition-colors ${isIdleView ? 'hidden' : ''}`}><MaximizeIcon className="w-6 h-6" /></button>
                        <button onClick={() => setToolsOpen(!toolsOpen)} className={`p-2.5 text-[var(--text-base)] hover:text-primary transition-colors ${isIdleView ? 'hidden' : ''}`}><AdjustmentsIcon className="w-6 h-6" /></button>
                        <div className="hidden md:flex items-center gap-3"><VolumeIcon className="w-5 h-5 text-slate-400" /><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-24 accent-primary cursor-pointer h-1.5 bg-slate-400/30 rounded-full" /></div>
                    </div>
               </div>
           </div>
        </div>

        <Suspense fallback={null}>
            <ToolsPanel 
                isOpen={toolsOpen} 
                onClose={() => setToolsOpen(false)} 
                eqGains={eqGains} 
                setEqGain={(i, v) => setEqGains(p => { const n = [...p]; n[i] = v; return n; })} 
                onSetEqValues={(vals) => setEqGains(vals)} 
                sleepTimer={sleepTimer} 
                setSleepTimer={setSleepTimer} 
                currentTheme={currentTheme} 
                setTheme={setCurrentTheme} 
                baseTheme={baseTheme} 
                setBaseTheme={setBaseTheme} 
                language={language} 
                setLanguage={setLanguage} 
                visualizerVariant={visualizerVariant} 
                setVisualizerVariant={setVisualizerVariant} 
                vizSettings={vizSettings} 
                setVizSettings={setVizSettings} 
                onStartTutorial={() => { setToolsOpen(false); setTutorialOpen(true); }} 
                onOpenManual={() => { setToolsOpen(false); setManualOpen(true); }} 
                onOpenProfile={() => { setToolsOpen(false); setShowProfileSetup(true); }} 
                showDeveloperNews={showDeveloperNews} 
                setShowDeveloperNews={handleToggleDevNews} 
                ambience={ambience} 
                setAmbience={setAmbience} 
                alarm={alarm} 
                setAlarm={setAlarm} 
                customCardColor={customCardColor} 
                setCustomCardColor={setCustomCardColor} 
                fxSettings={fxSettings} 
                setFxSettings={setFxSettings} 
                audioEnhancements={audioEnhancements} 
                setAudioEnhancements={setAudioEnhancements}
                onGlobalReset={() => {
                   if (window.confirm(language === 'ru' ? TRANSLATIONS.ru.resetConfirm : TRANSLATIONS.en.resetConfirm)) {
                       localStorage.clear();
                       window.location.reload();
                   }
                }}
            />
        </Suspense>
        <Suspense fallback={null}><ManualModal isOpen={manualOpen} onClose={() => setManualOpen(false)} language={language} onShowFeature={handleShowFeature} /><TutorialOverlay isOpen={tutorialOpen || !!highlightFeature} onClose={() => { setTutorialOpen(false); setHighlightFeature(null); }} language={language} highlightFeature={highlightFeature} /></Suspense>
        <Suspense fallback={null}><DownloadAppModal isOpen={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} language={language} installPrompt={installPrompt} /></Suspense>
        <Suspense fallback={null}><FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} language={language} /></Suspense>
        {showProfileSetup && <Suspense fallback={null}><ProfileSetup onComplete={handleProfileComplete} language={language} initialProfile={currentUser} onCancel={() => setShowProfileSetup(false)} /></Suspense>}
      </main>
      <Suspense fallback={null}><ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} language={language} onLanguageChange={setLanguage} currentUser={currentUser} onUpdateCurrentUser={setCurrentUser} isPlaying={isPlaying} onTogglePlay={togglePlay} onNextStation={handleNextStation} onPrevStation={handlePreviousStation} currentStation={currentStation} analyserNode={analyserNode} volume={volume} onVolumeChange={setVolume} visualMode={visualMode} /></Suspense>
    </div>
  );
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppContent />
        </ErrorBoundary>
    );
}
