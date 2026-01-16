
import React, { useState, useRef, useEffect } from 'react';
import { 
    XMarkIcon, PaperAirplaneIcon, UsersIcon, 
    PlayIcon, MicrophoneIcon, ArrowLeftIcon,
    PhoneIcon, VideoCameraIcon, StopIcon
} from './Icons';
import { ChatMessage, UserProfile, Language, RadioStation, VisualMode } from '../types';
import { chatService } from '../services/chatService';
import { voiceService } from '../services/voiceService';
import { webrtcService } from '../services/webrtcService';
import { TRANSLATIONS } from '../constants';

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

const ChatPanel: React.FC<ChatPanelProps> = ({ 
  isOpen, onClose, language, currentUser, onUpdateCurrentUser 
}) => {
  const [view, setView] = useState<'auth' | 'list' | 'chat'>('auth');
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'ringing' | 'active'>('idle');
  const [isIncoming, setIsIncoming] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    if (isOpen && currentUser.isAuthenticated) {
      chatService.init(currentUser);
      
      const unsubPresence = chatService.subscribeToPresence(setOnlineUsers);
      const unsubMessages = chatService.subscribeToMessages((msg) => {
        if (activePartner && msg.sessionId === activePartner.id) {
          setMessages(prev => [...prev, msg]);
        }
      });

      chatService.onSignal(async (data) => {
        if (data.type === 'audio' || data.type === 'video') {
            setIsIncoming(true);
            setCallState('ringing');
            setActivePartner(onlineUsers.find(u => u.id === data.from) || null);
        }
        await webrtcService.handleSignal(data.from, data.signal);
        if (data.type === 'hangup') setCallState('idle');
      });

      webrtcService.onRemoteStream = (stream) => {
          setCallState('active');
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      };

      return () => {
        unsubPresence();
        unsubMessages();
      };
    }
  }, [isOpen, currentUser.isAuthenticated, activePartner, onlineUsers]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const startPrivateChat = async (user: UserProfile) => {
    setActivePartner(user);
    setMessages(chatService.getMemoryHistory(user.id));
    await chatService.startSecureSession(user.id);
    setView('chat');
  };

  const sendText = async () => {
    if (!inputText.trim() || !activePartner) return;
    const msg = await chatService.sendMessage(activePartner.id, currentUser.id, inputText);
    setMessages(prev => [...prev, msg]);
    setInputText('');
  };

  const toggleVoice = async () => {
    if (isRecording) {
      const audio = await voiceService.stopRecording();
      if (activePartner) {
        const msg = await chatService.sendMessage(activePartner.id, currentUser.id, undefined, audio);
        setMessages(prev => [...prev, msg]);
      }
      setIsRecording(false);
    } else {
      await voiceService.startRecording();
      setIsRecording(true);
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
      if (!activePartner) return;
      setCallState('calling');
      const stream = await webrtcService.initiateCall(activePartner.id, type);
      if (type === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream;
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-full md:w-[420px] bg-[#0f172a] border-l border-white/10 z-[150] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
      
      {/* Call UI */}
      {callState !== 'idle' && (
          <div className="absolute inset-0 z-[200] bg-black flex flex-col items-center justify-center p-8">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-800 mb-6 border-2 border-primary">
                  <img src={activePartner?.avatar || ''} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{activePartner?.name}</h3>
              <p className="text-sm text-primary uppercase tracking-widest animate-pulse mb-12">{callState === 'ringing' ? 'Incoming...' : callState === 'calling' ? 'Connecting...' : 'Live Stream'}</p>
              
              <div className="flex-1 w-full relative rounded-3xl overflow-hidden bg-slate-900 border border-white/5 mb-8">
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-44 rounded-xl object-cover border border-white/20" />
              </div>

              <div className="flex gap-8">
                  {isIncoming && callState === 'ringing' && (
                      <button onClick={() => webrtcService.handleSignal(activePartner!.id, { sdp: { type: 'offer' } })} className="p-6 bg-green-500 rounded-full shadow-lg"><PhoneIcon className="w-8 h-8 text-white" /></button>
                  )}
                  <button onClick={() => webrtcService.hangup(activePartner?.id)} className="p-6 bg-red-500 rounded-full shadow-lg"><StopIcon className="w-8 h-8 text-white" /></button>
              </div>
          </div>
      )}

      <header className="h-20 flex items-center justify-between px-6 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          {view === 'chat' && <button onClick={() => setView('list')} className="p-2 text-slate-400"><ArrowLeftIcon className="w-5 h-5" /></button>}
          <h2 className="font-black uppercase text-sm text-primary tracking-tighter">
            {view === 'chat' ? activePartner?.name : 'Real-Time Relay'}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400"><XMarkIcon className="w-6 h-6" /></button>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {view === 'auth' && (
          <div className="p-12 text-center flex flex-col h-full items-center justify-center gap-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20"><UsersIcon className="w-10 h-10 text-primary" /></div>
            <div>
                <h3 className="text-xl font-bold text-white mb-2">Ephemeral Hub</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Connect to the live network. No history is stored. All data is wiped when you leave.</p>
            </div>
            <button onClick={() => { onUpdateCurrentUser({...currentUser, isAuthenticated: true}); setView('list'); }} className="w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Join Network</button>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest leading-normal">System Policy: Messages are NOT archived. F5 wipes all traces.</p>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div className="p-4 flex flex-col h-full">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 px-2">Active Listeners ({onlineUsers.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {onlineUsers.filter(u => u.id !== currentUser.id).map(user => (
                <button key={user.id} onClick={() => startPrivateChat(user)} className="w-full p-4 bg-white/[0.03] border border-white/5 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/10 overflow-hidden relative">
                    <img src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{user.country || 'Global'}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </button>
              ))}
              {onlineUsers.length <= 1 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                      <UsersIcon className="w-12 h-12" />
                      <p className="text-xs uppercase font-black tracking-widest">Listening Solo</p>
                  </div>
              )}
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="flex flex-col h-full bg-black/20">
            <div className="flex items-center justify-center py-4 bg-white/[0.02] border-b border-white/5 gap-6">
                <button onClick={() => startCall('audio')} className="p-3 text-slate-400 hover:text-green-500 transition-colors"><PhoneIcon className="w-6 h-6" /></button>
                <button onClick={() => startCall('video')} className="p-3 text-slate-400 hover:text-blue-500 transition-colors"><VideoCameraIcon className="w-6 h-6" /></button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm ${m.senderId === currentUser.id ? 'bg-primary text-white shadow-xl' : 'bg-white/5 text-slate-200'}`}>
                    {m.text && <p className="leading-relaxed">{m.text}</p>}
                    {m.audioBase64 && (
                      <button onClick={() => new Audio(m.audioBase64).play()} className="flex items-center gap-3 py-1">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shadow-inner"><PlayIcon className="w-5 h-5" /></div>
                        <span className="text-[10px] font-black uppercase opacity-60">Voice Stream</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-black/40 border-t border-white/5 backdrop-blur-xl">
              <div className="flex items-end gap-3">
                <button 
                  onMouseDown={toggleVoice} 
                  onMouseUp={toggleVoice}
                  className={`p-5 rounded-2xl transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                >
                  <MicrophoneIcon className="w-6 h-6" />
                </button>
                <div className="flex-1 relative">
                  <textarea 
                    rows={1}
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendText())}
                    placeholder="E2EE Payload..." 
                    className="w-full bg-white/5 border border-white/5 outline-none py-4 px-5 rounded-3xl text-sm text-white resize-none"
                  />
                </div>
                <button onClick={sendText} className="p-5 bg-primary text-white rounded-2xl shadow-xl active:scale-90 transition-all">
                  <PaperAirplaneIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ChatPanel;
