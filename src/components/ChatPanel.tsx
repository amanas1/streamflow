
import React, { useState, useRef, useEffect } from 'react';
import { 
    XMarkIcon, PaperAirplaneIcon, UsersIcon, 
    PlayIcon, PauseIcon, SearchIcon,
    PhoneIcon, VideoCameraIcon, ArrowLeftIcon, LoadingIcon
} from './Icons';
import { ChatMessage, UserProfile, Language, RadioStation, ChatSession, VisualMode } from '../types';
import { chatService } from '../services/chatService';
import { TRANSLATIONS, COUNTRIES_DATA } from '../constants';

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

const AGES = Array.from({ length: 63 }, (_, i) => (i + 18).toString()); 
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const ChatPanel: React.FC<ChatPanelProps> = (props) => {
  const { isOpen, onClose, language, currentUser, onUpdateCurrentUser, isPlaying, onTogglePlay, currentStation } = props;

  const [view, setView] = useState<'auth' | 'register' | 'search' | 'chat'>('auth');
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveUsers, setLiveUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Call State
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Reg State
  const [regName, setRegName] = useState('');
  const [regAge, setRegAge] = useState('25');
  const [regGender, setRegGender] = useState<'male' | 'female' | 'other'>('male');
  const [inputText, setInputText] = useState('');

  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  useEffect(() => {
    if (currentUser.isAuthenticated) {
      if (currentUser.country === 'Unknown') setView('register');
      else {
          setView('search');
          refreshUsers();
      }
    } else setView('auth');
  }, [currentUser.isAuthenticated, currentUser.country]);

  // Keep presence updated while panel is open
  useEffect(() => {
      if (!currentUser.id || !isOpen) return;
      const interval = setInterval(() => {
          // Fix: lastSeen is now recognized as a valid property of Partial<UserProfile>
          chatService.updateUserProfile(currentUser.id, { lastSeen: Date.now() });
      }, 60000);
      return () => clearInterval(interval);
  }, [currentUser.id, isOpen]);

  useEffect(() => {
    if (activeSession) {
      const unsubMsgs = chatService.subscribeToSession(activeSession.id, (msg) => {
        setMessages(prev => [...prev, msg]);
      });
      const unsubCalls = chatService.subscribeToCallSignals(activeSession.id, handleCallSignal);
      return () => { unsubMsgs(); unsubCalls(); };
    }
  }, [activeSession]);

  useEffect(() => { if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream; }, [localStream, callState]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream, callState]);

  const refreshUsers = async () => {
      setIsSearching(true);
      try {
          const users = await chatService.getLiveUsers(currentUser.id);
          setLiveUsers(users);
      } finally {
          setIsSearching(false);
      }
  };

  const handleCallSignal = async (signal: any) => {
    if (signal.senderId === currentUser.id) return;
    if (signal.type === 'offer') {
      setIncomingOffer(signal.sdp);
      setCallType(signal.callType);
      setCallState('incoming');
    } else if (signal.type === 'answer') {
      if (pcRef.current) await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      setCallState('active');
    } else if (signal.type === 'candidate') {
      if (pcRef.current) await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } else if (signal.type === 'hangup') endCallLocally();
  };

  const initRTC = async (type: 'audio' | 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
    setLocalStream(stream);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    pc.onicecandidate = (event) => {
      if (event.candidate && activeSession) {
        chatService.sendCallSignal(activeSession.id, currentUser.id, { type: 'candidate', candidate: event.candidate });
      }
    };
    pc.ontrack = (event) => setRemoteStream(event.streams[0]);
    return pc;
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!activeSession) return;
    setCallType(type);
    setCallState('calling');
    const pc = await initRTC(type);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    chatService.sendCallSignal(activeSession.id, currentUser.id, { type: 'offer', sdp: offer, callType: type });
  };

  const acceptCall = async () => {
    if (!activeSession || !incomingOffer) return;
    const pc = await initRTC(callType);
    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    chatService.sendCallSignal(activeSession.id, currentUser.id, { type: 'answer', sdp: answer });
    setCallState('active');
  };

  const endCall = () => {
    if (activeSession) chatService.sendCallSignal(activeSession.id, currentUser.id, { type: 'hangup' });
    endCallLocally();
  };

  const endCallLocally = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (pcRef.current) pcRef.current.close();
    setLocalStream(null); setRemoteStream(null); setIncomingOffer(null); setCallState('idle');
  };

  const handleLogin = async () => {
    const user = await chatService.signInAnonymously();
    onUpdateCurrentUser({ ...currentUser, ...user, isAuthenticated: true });
  };

  const handleRegistrationComplete = async () => {
    const updated = { ...currentUser, name: regName, age: parseInt(regAge), country: 'Global', city: 'Online', gender: regGender, hasAgreedToRules: true };
    await chatService.updateUserProfile(currentUser.id, updated);
    onUpdateCurrentUser(updated);
    setView('search');
    refreshUsers();
  };

  const partnerDetails = activeSession ? liveUsers.find(u => u.id === activeSession.participants.find(p => p !== currentUser.id)) || { name: 'Chat Partner', avatar: 'https://i.pravatar.cc/100' } : null;

  if (!isOpen) return null;

  return (
    <aside className="w-full md:w-[420px] flex flex-col glass-panel border-l border-white/10 shadow-2xl z-[60] h-full fixed right-0 top-0 bottom-0 bg-[#0f172a]/95 backdrop-blur-xl animate-in slide-in-from-right duration-500">
      {callState !== 'idle' && (
        <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300 backdrop-blur-2xl">
          <div className="relative w-full h-full flex flex-col items-center">
            {callType === 'video' ? (
              <div className="flex-1 w-full relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 w-1/4 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-black">
                   <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
                </div>
                {callState === 'calling' && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><p className="text-white font-bold animate-pulse text-sm uppercase tracking-widest">Calling...</p></div>}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                 <div className="w-32 h-32 rounded-full border-4 border-primary/50 p-1 mb-6 animate-pulse">
                    <img src={partnerDetails?.avatar} className="w-full h-full rounded-full object-cover" />
                 </div>
                 <h3 className="text-2xl font-black text-white">{partnerDetails?.name}</h3>
                 <p className="text-slate-400 text-xs uppercase tracking-widest mt-2">{callState === 'calling' ? 'Outgoing Call...' : 'Incoming Call...'}</p>
              </div>
            )}
            <div className="mt-8 flex gap-6">
              {callState === 'incoming' ? (
                <>
                  <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"><VideoCameraIcon className="w-8 h-8" /></button>
                  <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"><XMarkIcon className="w-8 h-8" /></button>
                </>
              ) : (
                <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all hover:bg-red-500"><PhoneIcon className="w-8 h-8 rotate-[135deg]" /></button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0">
        {view === 'chat' && partnerDetails ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button onClick={() => { setView('search'); setActiveSession(null); }} className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/5"><ArrowLeftIcon className="w-5 h-5" /></button>
            <img src={partnerDetails.avatar || ''} className="w-10 h-10 rounded-full border border-white/10" />
            <div className="min-w-0 flex-1"><h3 className="font-bold text-sm text-white truncate">{partnerDetails.name}</h3><p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Online</p></div>
            <div className="flex items-center gap-1">
               <button onClick={() => startCall('audio')} className="p-2.5 text-slate-300 hover:text-primary transition-colors hover:bg-white/5 rounded-full"><PhoneIcon className="w-5 h-5" /></button>
               <button onClick={() => startCall('video')} className="p-2.5 text-slate-300 hover:text-primary transition-colors hover:bg-white/5 rounded-full"><VideoCameraIcon className="w-5 h-5" /></button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {t.findFriends}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors bg-white/5 rounded-full"><XMarkIcon className="w-5 h-5" /></button>
          </>
        )}
      </header>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        {view === 'auth' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"><UsersIcon className="w-12 h-12 text-primary" /></div>
            <button onClick={handleLogin} className="px-6 py-3.5 bg-white text-black rounded-2xl font-bold text-sm shadow-xl w-full hover:scale-[1.02] active:scale-95 transition-all">{t.signInGuest}</button>
          </div>
        )}
        {view === 'register' && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right">
             <h3 className="text-2xl font-black text-white mb-6 text-center">{t.completeProfile}</h3>
             <div className="space-y-4">
                <input value={regName} onChange={e => setRegName(e.target.value)} placeholder={t.displayName} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all font-semibold" />
                <div className="grid grid-cols-2 gap-4">
                   <select value={regAge} onChange={e => setRegAge(e.target.value)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none">{AGES.map(a => <option key={a} value={a}>{a}</option>)}</select>
                   <select value={regGender} onChange={e => setRegGender(e.target.value as any)} className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"><option value="male">{t.male}</option><option value="female">{t.female}</option></select>
                </div>
             </div>
             <button onClick={handleRegistrationComplete} className="mt-8 w-full py-4 bg-primary text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">{t.saveAndEnter}</button>
          </div>
        )}
        {view === 'search' && (
          <div className="flex-1 flex flex-col p-4 overflow-y-auto no-scrollbar">
             <div className="flex items-center justify-between mb-4 px-2">
                 <h3 className="text-sm font-black text-white uppercase tracking-widest">{t.online} ({liveUsers.length})</h3>
                 <button onClick={refreshUsers} className="text-[10px] font-bold text-primary uppercase">{isSearching ? '...' : 'Update'}</button>
             </div>
             <div className="space-y-3 pb-20">
                {liveUsers.length === 0 ? (
                    <div className="text-center py-20 opacity-40"><UsersIcon className="w-12 h-12 mx-auto mb-4" /><p className="text-xs">{isSearching ? 'Loading users...' : 'No one else is online yet'}</p></div>
                ) : (
                    liveUsers.map(user => (
                    <div key={user.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-colors">
                        <img src={user.avatar || ''} className="w-12 h-12 rounded-xl object-cover" />
                        <div className="flex-1 min-w-0"><h5 className="font-bold text-sm text-white truncate">{user.name}</h5><p className="text-[10px] text-slate-400 font-medium">{user.age} • {user.country}</p></div>
                        <button onClick={() => { setActiveSession(chatService.acceptRequest(currentUser.id, user.id)); setView('chat'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 transition-colors">Chat</button>
                    </div>
                    ))
                )}
             </div>
          </div>
        )}
        {view === 'chat' && activeSession && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
             <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-24">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                     <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.senderId === currentUser.id ? 'bg-primary text-white rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                        {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                        <div className="text-[8px] mt-1 opacity-60 font-bold text-right">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                     </div>
                  </div>
                ))}
             </div>
             <div className="absolute bottom-0 inset-x-0 p-3 bg-[#0f172a]/95 backdrop-blur-md border-t border-white/5">
                <div className="flex items-center gap-2">
                   <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (()=>{chatService.sendMessage(activeSession.id, currentUser.id, inputText); setInputText('');})()} placeholder="Message..." className="flex-1 bg-white/5 border-none outline-none py-3 px-4 text-sm text-white rounded-2xl font-medium" />
                   <button onClick={()=>{chatService.sendMessage(activeSession.id, currentUser.id, inputText); setInputText('');}} className="p-3 bg-primary text-white rounded-full shadow-lg"><PaperAirplaneIcon className="w-6 h-6" /></button>
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-slate-900 border-t border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-1">
             <div className="flex items-center gap-3 w-full">
                <div className="h-8 flex-1 bg-black/30 rounded-lg overflow-hidden relative border border-white/5 flex items-center px-3">
                   <span className="text-[9px] font-black text-white truncate">{currentStation?.name || 'No station selected'}</span>
                   {isPlaying && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
                </div>
                <button onClick={onTogglePlay} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all">
                  {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                </button>
             </div>
          </div>
      </div>
    </aside>
  );
};

export default ChatPanel;
