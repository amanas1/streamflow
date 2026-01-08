
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    XMarkIcon, PaperAirplaneIcon, UsersIcon, 
    MicrophoneIcon, FaceSmileIcon, PaperClipIcon, 
    PlayIcon, PauseIcon, CameraIcon, SearchIcon, NoSymbolIcon,
    NextIcon, PreviousIcon, VolumeIcon, ChevronDownIcon, ChevronUpIcon,
    HeartIcon, PhoneIcon, VideoCameraIcon, ArrowLeftIcon
} from './Icons';
import { ChatMessage, UserProfile, Language, RadioStation, ChatSession, ChatRequest, VisualMode } from '../types';
import AudioVisualizer from './AudioVisualizer';
import DancingAvatar from './DancingAvatar';
import { chatService } from '../services/chatService';
import { TRANSLATIONS, COUNTRIES_DATA, DEMO_USERS } from '../constants';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  currentUser: UserProfile;
  onUpdateCurrentUser: (user: UserProfile) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNextStation: () => void;
  onPrevStation: () => void;
  currentStation: RadioStation | null;
  analyserNode: AnalyserNode | null;
  volume: number;
  onVolumeChange: (vol: number) => void;
  visualMode: VisualMode;
}

const EMOJIS = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🧠', '🦴', '👀', '👁', '👄', '💋', '👅', '👂', '👃', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '🤎', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'
];

const AGES = Array.from({ length: 63 }, (_, i) => (i + 18).toString()); 

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; // Increased resolution slightly for better quality up to 2MB
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = scaleSize < 1 ? MAX_WIDTH : img.width;
                canvas.height = scaleSize < 1 ? img.height * scaleSize : img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8)); // Increased quality slightly
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

const EphemeralMedia = ({ timestamp, children }: React.PropsWithChildren<{ timestamp: number }>) => {
    const [isFading, setIsFading] = useState(false);
    useEffect(() => {
        const checkTime = () => {
            const age = Date.now() - timestamp;
            // Start fading at 7 seconds, fully deleted by service at 10 seconds
            if (age >= 7000 && !isFading) setIsFading(true);
        };
        const interval = setInterval(checkTime, 250);
        checkTime();
        return () => clearInterval(interval);
    }, [timestamp, isFading]);
    return <div className={`transition-opacity duration-[3000ms] ease-linear ${isFading ? 'opacity-0' : 'opacity-100'}`}>{children}</div>;
};

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    isOpen, onClose, language, onLanguageChange,
    currentUser, onUpdateCurrentUser,
    isPlaying, onTogglePlay, onNextStation, onPrevStation, currentStation, analyserNode,
    volume, onVolumeChange, visualMode
}) => {
  const [view, setView] = useState<'auth' | 'register' | 'search' | 'inbox' | 'chat'>('auth');
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('25');
  const [regCountry, setRegCountry] = useState(COUNTRIES_DATA[0].name);
  const [regCity, setRegCity] = useState(COUNTRIES_DATA[0].cities[0]);
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('male');
  const [searchName, setSearchName] = useState('');
  const [searchLogin, setSearchLogin] = useState('');
  const [searchAge, setSearchAge] = useState('Any');
  const [searchCountry, setSearchCountry] = useState('Any');
  const [searchCity, setSearchCity] = useState('Any');
  const [searchResults, setSearchResults] = useState<UserProfile[]>(DEMO_USERS);
  const [sentKnocks, setSentKnocks] = useState<Set<string>>(new Set());
  const [inputText, setInputText] = useState('');
  const [isPlayerOpen, setIsPlayerOpen] = useState(true);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  useEffect(() => {
      if (currentUser.isAuthenticated) {
          if (!currentUser.country || !currentUser.age) {
              setRegName(currentUser.name);
              setView('register');
          } else {
              setView('search');
              loadData();
              startPolling();
          }
      } else {
          setView('auth');
      }
      return () => stopPolling();
  }, [currentUser.isAuthenticated]);

  const availableCitiesReg = useMemo(() => COUNTRIES_DATA.find(c => c.name === regCountry)?.cities || [], [regCountry]);
  const availableCitiesSearch = useMemo(() => COUNTRIES_DATA.find(c => c.name === searchCountry)?.cities || [], [searchCountry]);

  useEffect(() => { setRegCity(availableCitiesReg[0]); }, [availableCitiesReg]);
  useEffect(() => { if (activeSession) { loadMessages(activeSession.id); setTimeout(scrollToBottom, 100); } }, [activeSession]);
  useEffect(() => { scrollToBottom(); }, [messages, view]);

  const loadData = () => { if (!currentUser.id) return; setChats(chatService.getMyChats(currentUser.id)); setRequests(chatService.getIncomingKnocks(currentUser.id)); };
  const loadMessages = (sessionId: string) => { setMessages(chatService.getMessages(sessionId)); };
  const startPolling = () => { stopPolling(); pollingInterval.current = window.setInterval(() => { if (currentUser.id) { const newRequests = chatService.getIncomingKnocks(currentUser.id); if (JSON.stringify(newRequests) !== JSON.stringify(requests)) setRequests(newRequests); const newChats = chatService.getMyChats(currentUser.id); if (newChats.length !== chats.length || newChats[0]?.updatedAt !== chats[0]?.updatedAt) setChats(newChats); if (activeSession) { const msgs = chatService.getMessages(activeSession.id); if (msgs.length !== messages.length || msgs.length === 0) setMessages(msgs); } } }, 1500); };
  const stopPolling = () => { if (pollingInterval.current) clearInterval(pollingInterval.current); };

  const handleLogin = async () => { const partialUser = await chatService.signInAnonymously(); onUpdateCurrentUser({ ...currentUser, ...partialUser } as UserProfile); };

  const handleRegistrationComplete = () => {
      const updatedUser: UserProfile = { ...currentUser, name: regName, age: parseInt(regAge), country: regCountry, city: regCity, gender: regGender, hasAgreedToRules: true };
      onUpdateCurrentUser(updatedUser);
      localStorage.setItem('streamflow_user_profile', JSON.stringify(updatedUser));
      setView('search');
      loadData();
      startPolling();
  };

  const handleSearch = () => {
      const nameFilter = searchName.trim().toLowerCase();
      const loginFilter = searchLogin.trim().toLowerCase();
      const results = DEMO_USERS.filter(u => {
          const matchName = !nameFilter || u.name.toLowerCase().includes(nameFilter);
          const matchLogin = !loginFilter || (u.id && u.id.toLowerCase().includes(loginFilter)) || u.name.toLowerCase().includes(loginFilter);
          const matchAge = searchAge === 'Any' || u.age.toString() === searchAge;
          const matchCountry = searchCountry === 'Any' || u.country === searchCountry;
          const matchCity = searchCity === 'Any' || u.city === searchCity;
          return matchName && matchLogin && matchAge && matchCountry && matchCity;
      });
      setSearchResults(results);
  };

  const handleKnock = async (targetUser: UserProfile) => {
      if (!currentUser.id) return;
      setSentKnocks(prev => new Set(prev).add(targetUser.id));
      await chatService.sendKnock(currentUser, targetUser);
      setTimeout(() => {
          const session = chatService.acceptRequest(`req_demo_${Date.now()}`, currentUser.id, targetUser.id);
          setChats(chatService.getMyChats(currentUser.id));
          chatService.sendMessage(session.id, targetUser.id, language === 'ru' ? 'Привет! Рад знакомству 👋' : 'Hello! Nice to meet you 👋');
          setActiveSession(session);
          setView('chat');
      }, 1500);
  };

  const handleAcceptRequest = (req: ChatRequest) => { if (!currentUser.id) return; const session = chatService.acceptRequest(req.id, currentUser.id, req.fromUserId); setRequests(prev => prev.filter(r => r.id !== req.id)); setChats(prev => [session, ...prev]); setActiveSession(session); setView('chat'); };
  const handleRejectRequest = (req: ChatRequest) => { chatService.rejectRequest(req.id); setRequests(prev => prev.filter(r => r.id !== req.id)); };
  const handleSendMessage = () => { if (!inputText.trim() || !activeSession || !currentUser.id) return; chatService.sendMessage(activeSession.id, currentUser.id, inputText); setInputText(''); loadMessages(activeSession.id); };
  const startRecording = async (e: React.PointerEvent) => { e.preventDefault(); if (isRecording) return; try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); audioChunksRef.current = []; const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'; const mediaRecorder = new MediaRecorder(stream, { mimeType }); mediaRecorderRef.current = mediaRecorder; mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); }; mediaRecorder.onstop = () => { if (audioChunksRef.current.length > 0 && activeSession && currentUser.id) { const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType }); const reader = new FileReader(); reader.readAsDataURL(audioBlob); reader.onloadend = () => chatService.sendMessage(activeSession.id, currentUser.id, undefined, undefined, reader.result as string); } stream.getTracks().forEach(track => track.stop()); setIsRecording(false); setRecordingTime(0); }; mediaRecorder.start(200); setIsRecording(true); recordingIntervalRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000); } catch (err) {} };
  const stopRecording = (e: React.PointerEvent) => { e.preventDefault(); if (mediaRecorderRef.current?.state === 'recording') { mediaRecorderRef.current.stop(); if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current); } };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (!file || !activeSession || !currentUser.id) return; 
      
      // Limit 2MB (2 * 1024 * 1024)
      if (file.size > 2 * 1024 * 1024) { 
          alert(language === 'ru' ? 'Фото не больше 2 МБ' : 'Photo must be under 2MB'); 
          return; 
      } 
      
      try { 
          const compressedBase64 = await compressImage(file); 
          chatService.sendMessage(activeSession.id, currentUser.id, undefined, compressedBase64, undefined); 
          loadMessages(activeSession.id); 
      } catch (err) { 
          console.error("Image compression failed", err); 
      } 
      
      if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const getPartnerId = (session: ChatSession) => session.participants.find(id => id !== currentUser.id) || 'unknown';
  const getPartnerDetails = (partnerId: string) => DEMO_USERS.find(u => u.id === partnerId) || { id: partnerId, name: partnerId.includes('bot') ? 'System Bot' : `User ${partnerId.substr(0,4)}`, avatar: partnerId.includes('bot') ? 'https://api.dicebear.com/7.x/bottts/svg?seed=streamflow' : `https://i.pravatar.cc/100?u=${partnerId}` } as any;

  if (!isOpen) return null;
  const partnerDetails = activeSession ? getPartnerDetails(getPartnerId(activeSession)) : null;

  return (
    <aside className="w-full md:w-[420px] flex flex-col glass-panel border-l border-[var(--panel-border)] shadow-2xl animate-in slide-in-from-right duration-500 bg-[var(--panel-bg)] z-[60] h-full fixed right-0 top-0 bottom-0">
        <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-transparent shrink-0 relative z-50">
            {view === 'chat' && partnerDetails ? (
                <>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={() => { setView('inbox'); setActiveSession(null); }} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/10"><ArrowLeftIcon className="w-5 h-5" /></button>
                        <img src={partnerDetails.avatar} className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 object-cover" />
                        <div className="min-w-0 flex-1"><h3 className="font-bold text-sm text-white truncate leading-tight">{partnerDetails.name}</h3><p className="text-[10px] text-green-500 font-bold uppercase tracking-widest leading-tight">{t.online}</p></div>
                    </div>
                    <div className="flex items-center gap-1"><button className="p-2.5 text-slate-300 hover:text-primary transition-colors hover:bg-white/5 rounded-full"><PhoneIcon className="w-5 h-5" /></button><button className="p-2.5 text-slate-300 hover:text-primary transition-colors hover:bg-white/5 rounded-full"><VideoCameraIcon className="w-5 h-5" /></button><button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors ml-1"><XMarkIcon className="w-6 h-6" /></button></div>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        {view !== 'auth' && view !== 'register' && (<button onClick={() => setView(view === 'search' ? 'inbox' : 'search')} className="text-slate-400 hover:text-white transition-colors">{view === 'search' ? <UsersIcon className="w-6 h-6 text-primary" /> : <SearchIcon className="w-6 h-6" />}</button>)}
                        <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>{view === 'search' ? t.findFriends : t.privateChat}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full border border-white/5"><XMarkIcon className="w-5 h-5" /></button>
                </>
            )}
        </header>

        <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent">
            {view === 'auth' && (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-[0_0_40px_rgba(188,111,241,0.1)] mb-4"><UsersIcon className="w-16 h-16 text-primary opacity-80" /></div>
                    <div><p className="text-sm text-slate-400 leading-relaxed max-w-[250px] mx-auto">{t.authDesc}</p></div>
                    <button onClick={handleLogin} className="flex items-center gap-3 px-6 py-4 bg-white text-black rounded-2xl font-bold text-sm shadow-xl hover:scale-105 transition-transform active:scale-95 w-full justify-center">
                        {t.signInGuest}
                    </button>
                </div>
            )}
            
            {view === 'register' && (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                    <h3 className="text-2xl font-black text-white mb-6 text-center">{t.completeProfile}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.displayName}</label>
                            <input value={regName} onChange={(e) => setRegName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all font-semibold" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.gender}</label>
                            <div className="flex bg-white/5 rounded-xl p-1">
                                {(['male', 'female'] as const).map(g => (
                                    <button key={g} onClick={() => setRegGender(g)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all uppercase ${regGender === g ? 'bg-primary text-white' : 'text-slate-400'}`}>{t[g]}</button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.age}</label>
                                <select value={regAge} onChange={(e) => setRegAge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none appearance-none font-bold">
                                    {AGES.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.country}</label>
                                <select value={regCountry} onChange={(e) => setRegCountry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none appearance-none font-bold">
                                    {COUNTRIES_DATA.map(c => <option key={c.name} value={c.name} className="bg-slate-900">{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.city}</label>
                            <select value={regCity} onChange={(e) => setRegCity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none appearance-none font-bold">
                                {availableCitiesReg.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleRegistrationComplete} className="mt-8 w-full py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all">{t.saveAndEnter}</button>
                </div>
            )}

            {view === 'search' && (
                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                    <div className="p-6 overflow-y-auto no-scrollbar pb-20">
                        <div className="space-y-4 mb-8">
                            <h3 className="text-xl font-black text-white text-center mb-4">{t.findFriends}</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.displayName}</label><input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-primary/50 transition-all font-semibold" /></div>
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.login}</label><input value={searchLogin} onChange={(e) => setSearchLogin(e.target.value)} placeholder="Login" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-primary/50 transition-all font-semibold" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.age}</label><select value={searchAge} onChange={(e) => setSearchAge(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-white text-xs outline-none appearance-none font-bold"><option value="Any" className="bg-slate-900">{t.any}</option>{AGES.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}</select></div>
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.country}</label><select value={searchCountry} onChange={(e) => setSearchCountry(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-white text-xs outline-none appearance-none font-bold"><option value="Any" className="bg-slate-900">{t.any}</option>{COUNTRIES_DATA.map(c => <option key={c.name} value={c.name} className="bg-slate-900">{c.name}</option>)}</select></div>
                                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{t.city}</label><select value={searchCity} onChange={(e) => setSearchCity(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2.5 text-white text-xs outline-none appearance-none font-bold"><option value="Any" className="bg-slate-900">{t.any}</option>{availableCitiesSearch.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}</select></div>
                            </div>
                            <button onClick={handleSearch} className="w-full py-3.5 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"><SearchIcon className="w-4 h-4" /> {t.search}</button>
                        </div>
                        <div className="space-y-3">
                            {searchResults.length === 0 ? (
                                <div className="text-center py-10 opacity-50"><UsersIcon className="w-12 h-12 mx-auto mb-2" /><p className="text-[10px] uppercase font-bold tracking-widest">{t.noUsers}</p><button onClick={() => { setSearchResults(DEMO_USERS); setSearchName(''); setSearchLogin(''); setSearchAge('Any'); setSearchCountry('Any'); setSearchCity('Any'); }} className="mt-2 text-[10px] text-primary underline">{t.showAll}</button></div>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-colors animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="relative"><img src={user.avatar || ''} className="w-12 h-12 rounded-xl object-cover bg-slate-800" /><div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#1e293b] ${user.status === 'online' ? 'bg-green-500' : 'bg-slate-500'}`}></div></div>
                                        <div className="flex-1 min-w-0"><h5 className="font-bold text-sm text-white truncate">{user.name}</h5><p className="text-[10px] text-slate-400 font-medium">{user.age} • {user.city}</p></div>
                                        <button onClick={() => handleKnock(user)} disabled={sentKnocks.has(user.id)} className={`px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all ${sentKnocks.has(user.id) ? 'bg-green-500/20 text-green-500' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'}`}>{sentKnocks.has(user.id) ? t.knockSent : t.knock}</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'inbox' && (
                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 animate-in slide-in-from-right duration-300">
                    {requests.length > 0 && (
                        <div className="space-y-3 mb-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary pl-2 mb-2">{t.knocking} ({requests.length})</h4>
                            {requests.map(req => { 
                                const details = getPartnerDetails(req.fromUserId); 
                                return (
                                    <div key={req.id} className="p-3 bg-white/5 border border-secondary/30 rounded-2xl flex items-center gap-3">
                                        <img src={details.avatar} className="w-10 h-10 rounded-full border border-white/10" />
                                        <div className="flex-1 min-w-0"><h5 className="font-bold text-sm text-white truncate">{details.name}</h5><p className="text-[10px] text-slate-400">{t.wantsToConnect}</p></div>
                                        <div className="flex gap-2"><button onClick={() => handleRejectRequest(req)} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-red-400 transition-colors"><XMarkIcon className="w-4 h-4" /></button><button onClick={() => handleAcceptRequest(req)} className="p-2 bg-secondary text-white rounded-full hover:scale-110 transition-transform shadow-lg"><HeartIcon className="w-4 h-4" filled /></button></div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2 mb-2">{t.myDialogs}</h4>
                        {chats.length === 0 ? (
                            <div className="text-center py-20 opacity-40"><UsersIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" /><p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{t.noChats}</p><p className="text-[10px] mt-2 text-slate-600 max-w-[200px] mx-auto">{t.useDiscovery}</p></div>
                        ) : (
                            chats.map(chat => { 
                                const pid = getPartnerId(chat); 
                                const details = getPartnerDetails(pid); 
                                return (
                                    <div key={chat.id} onClick={() => { setActiveSession(chat); setView('chat'); }} className="p-4 hover:bg-white/5 border border-transparent hover:border-white/5 rounded-[1.5rem] flex items-center gap-4 cursor-pointer transition-all active:scale-98 bg-white/[0.02]">
                                        <div className="relative"><img src={details.avatar} className="w-14 h-14 rounded-2xl object-cover bg-slate-800" /><div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#1e293b] rounded-full"></div></div>
                                        <div className="flex-1 min-w-0"><div className="flex justify-between items-baseline mb-1"><h5 className="font-bold text-sm text-white truncate">{details.name}</h5><span className="text-[10px] text-slate-500 font-bold">{chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span></div><p className="text-xs text-slate-400 truncate opacity-70 font-medium">{chat.lastMessage?.text || (chat.lastMessage?.audioBase64 ? '🎤 Audio Message' : (chat.lastMessage?.image ? '📷 Photo' : 'New Message'))}</p></div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {view === 'chat' && activeSession && (
                <div className="flex-1 flex flex-col h-full relative">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
                        <div className="text-center py-6"><span className="text-[10px] bg-white/5 px-3 py-1 rounded-full text-slate-500 uppercase font-bold tracking-widest">{t.today}</span></div>
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm backdrop-blur-md transition-all ${msg.senderId === currentUser.id ? 'bg-primary/20 border border-white/10 text-white rounded-tr-sm' : 'bg-white/5 border border-white/5 text-white rounded-tl-sm'}`}>
                                    {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.image && (
                                        <EphemeralMedia timestamp={msg.timestamp}>
                                            <div className="relative"><img src={msg.image} className="rounded-xl max-w-full mt-1 object-cover" /></div>
                                        </EphemeralMedia>
                                    )}
                                    {msg.audioBase64 && (
                                        <div className="flex items-center gap-3 py-1 min-w-[160px] pr-2">
                                            <button onClick={() => new Audio(msg.audioBase64).play()} className="p-2.5 bg-white/20 rounded-full hover:bg-white/30 transition-colors shrink-0"><PlayIcon className="w-4 h-4" /></button>
                                            <div className="flex-1 flex flex-col justify-center gap-1"><div className="h-1 bg-white/30 w-full rounded-full overflow-hidden relative"><div className="absolute inset-0 bg-white/60 w-1/3"></div></div><span className="text-[9px] uppercase font-bold opacity-70">0:05</span></div>
                                        </div>
                                    )}
                                    <div className={`text-[9px] mt-1 font-bold flex justify-end items-center gap-1 ${msg.senderId === currentUser.id ? 'text-white/60' : 'text-slate-500'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}{msg.senderId === currentUser.id && <span className="text-[10px]">✓</span>}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                </div>
            )}
        </div>

        {view === 'chat' && activeSession && (
            <div className="p-3 bg-transparent border-t border-white/5 shrink-0 relative z-40 pb-6 backdrop-blur-md">
                {isRecording && (<div className="absolute inset-x-2 -top-16 h-14 bg-red-600/90 backdrop-blur-md rounded-2xl flex items-center justify-between px-6 text-white animate-in slide-in-from-bottom border border-red-400/30 shadow-2xl z-50"><div className="flex items-center gap-3"><div className="w-3 h-3 bg-white rounded-full animate-ping"></div><span className="font-bold text-xs uppercase tracking-widest">{recordingTime}s {t.recording}</span></div><button onPointerUp={stopRecording} className="text-[10px] font-black bg-white text-red-600 px-4 py-2 rounded-xl hover:scale-105 transition-transform shadow-lg">{t.send}</button></div>)}
                {showEmojiPicker && (<div className="absolute bottom-24 left-2 right-2 bg-[#1e293b] p-3 rounded-[2rem] h-64 overflow-y-auto no-scrollbar grid grid-cols-8 gap-1 border border-white/10 shadow-2xl z-50 animate-in slide-in-from-bottom-5">{EMOJIS.map(e => <button key={e} onClick={() => { setInputText(p => p + e); setShowEmojiPicker(false); }} className="text-2xl hover:bg-white/10 rounded-lg p-1 transition-colors">{e}</button>)}</div>)}
                <div className="flex items-end gap-2"><button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-90"><PaperClipIcon className="w-6 h-6" /></button><div className="flex-1 bg-white/5 border border-white/5 rounded-[1.5rem] flex items-center px-2 min-h-[50px] hover:bg-white/10 transition-all"><input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'} className="flex-1 bg-transparent border-none outline-none py-3 px-3 text-sm text-white placeholder:text-slate-500 font-medium" /><button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-slate-400 hover:text-yellow-400 transition-colors active:scale-90"><FaceSmileIcon className="w-6 h-6" /></button><button onClick={() => cameraInputRef.current?.click()} className="p-2 text-slate-400 hover:text-white transition-colors active:scale-90 mr-1"><CameraIcon className="w-6 h-6" /></button></div>{inputText.trim() ? (<button onClick={handleSendMessage} className="p-3 bg-primary/40 border border-white/10 text-white rounded-full shadow-lg hover:bg-primary/60 active:scale-95 transition-all"><PaperAirplaneIcon className="w-6 h-6" /></button>) : (<button onPointerDown={startRecording} onPointerUp={stopRecording} onPointerLeave={isRecording ? stopRecording : undefined} className={`p-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}><MicrophoneIcon className="w-6 h-6" /></button>)}</div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} /><input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
            </div>
        )}

        <div className="px-4 py-3 bg-[var(--player-bar-bg)] border-t border-[var(--panel-border)] relative shrink-0 z-30">
            <div className="flex items-center justify-between mb-1"><div className="flex items-center gap-3 w-full"><button onClick={() => setIsVolumeOpen(!isVolumeOpen)} className={`p-2 rounded-xl transition-all ${isVolumeOpen ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-white'}`}><VolumeIcon className="w-5 h-5" /></button><div className="h-8 flex-1 bg-black/30 rounded-lg overflow-hidden relative border border-white/5 flex items-center justify-center"><AudioVisualizer analyserNode={analyserNode} isPlaying={isPlaying} variant="segmented" settings={{ scaleX: 1, scaleY: 1, brightness: 100, contrast: 100, saturation: 100, hue: 0, opacity: 0.4, speed: 1, autoIdle: false, performanceMode: true, energySaver: false }} /><div className="absolute inset-0 flex items-center justify-between px-3"><span className="text-[9px] font-black text-white truncate max-w-[100px]">{currentStation?.name || 'Radio'}</span>{isPlaying && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}</div></div><button onClick={() => setIsPlayerOpen(!isPlayerOpen)} className="p-2 text-slate-400 hover:text-white">{isPlayerOpen ? <ChevronDownIcon className="w-5 h-5" /> : <ChevronUpIcon className="w-5 h-5" />}</button></div></div>
            {isVolumeOpen && (<div className="absolute left-4 bottom-16 z-50 bg-[#0f172a] p-3 rounded-xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-2"><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} className="w-32 h-1 accent-primary cursor-pointer" /></div>)}
            {isPlayerOpen && (<div className="flex items-center justify-center gap-6 py-2 animate-in slide-in-from-top-2"><button onClick={onPrevStation} className="text-slate-400 hover:text-white transition-colors"><PreviousIcon className="w-5 h-5" /></button><button onClick={onTogglePlay} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all">{isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}</button><button onClick={onNextStation} className="text-slate-400 hover:text-white transition-colors"><NextIcon className="w-5 h-5" /></button></div>)}
        </div>
        
        {/* Pass visualMode to DancingAvatar */}
        <div className="hidden">
            <DancingAvatar isPlaying={isPlaying} className="" visualMode={visualMode} />
        </div>
    </aside>
  );
};

export default ChatPanel;
