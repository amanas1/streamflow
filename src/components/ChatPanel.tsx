
import React, { useState, useRef, useEffect } from 'react';
import { 
    XMarkIcon, PaperAirplaneIcon, 
    PlayIcon, PauseIcon, CameraIcon, 
    NextIcon, PreviousIcon, ArrowLeftIcon
} from './Icons';
import { ChatMessage, UserProfile, Language, RadioStation, ChatSession, VisualMode } from '../types';
import { chatService, COSTS } from '../services/chatService'; 
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

const WalletBadge = ({ credits, onTopUp }: { credits: number, onTopUp: () => void }) => (
    <button onClick={onTopUp} className="flex items-center gap-2 bg-gradient-to-r from-emerald-900 to-emerald-700 px-3 py-1.5 rounded-full border border-emerald-500/30 hover:scale-105 transition-transform">
        <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">CR</span>
        <span className="text-sm font-bold text-white tabular-nums">{credits}</span>
        <div className="w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center text-[10px] text-black font-bold">+</div>
    </button>
);

const EphemeralMessage = ({ msg }: { msg: ChatMessage }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = Math.max(0, msg.expiresAt - Date.now());
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setExpired(true);
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [msg.expiresAt]);

    if (expired) return null; // Component removes itself from DOM visually

    const maxDuration = msg.imageBase64 ? 10000 : 3600000;
    const progress = Math.min(100, (timeLeft / maxDuration) * 100);
    const isImage = !!msg.imageBase64;

    return (
        <div className={`relative group animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm backdrop-blur-md border border-white/10 text-white bg-white/5`}>
                {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                {isImage && (
                    <div className="relative mt-2">
                        <img src={msg.imageBase64} className="rounded-xl max-w-full object-cover blur-[20px] hover:blur-0 transition-all cursor-pointer" title="Hold to reveal (Costs 2 Credits)" />
                        <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] font-bold text-red-400 uppercase">
                            Auto-Destruct: {Math.ceil(timeLeft/1000)}s
                        </div>
                    </div>
                )}
                {/* Ephemeral Timer Bar */}
                <div className="mt-2 h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000 linear" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    isOpen, onClose, language, currentUser, onUpdateCurrentUser,
    isPlaying, onTogglePlay, onNextStation, onPrevStation
}) => {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [credits, setCredits] = useState(currentUser.credits || 0);
  const [showWallet, setShowWallet] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const t = TRANSLATIONS[language] || TRANSLATIONS['en'];

  // Initialize Chat Service & Wallet Listener
  useEffect(() => {
      if (isOpen) {
          chatService.initializeUser().then(user => {
              onUpdateCurrentUser(user);
              // Start listening to wallet
              chatService.subscribeToWallet(user.id, (bal) => setCredits(bal));
              // For demo: Automatically join a global room or creates one
              const demoSessionId = "global_demo_room"; 
              setSession({ id: demoSessionId, participants: [], lastActivity: Date.now() });
          });
      }
  }, [isOpen]);

  // Message Subscription
  useEffect(() => {
      if (!session) return;
      
      const unsubscribe = chatService.subscribeToSession(session.id, (newMsg) => {
          setMessages(prev => {
              // Prevent duplicates
              if (prev.find(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
          });
          setTimeout(() => scrollToBottom(), 100);
      });

      // Cleanup RAM loop
      const cleaner = setInterval(() => {
          const now = Date.now();
          setMessages(prev => prev.filter(m => m.expiresAt > now));
      }, 5000);

      return () => {
          unsubscribe(); // Stop listening to RTDB
          clearInterval(cleaner);
      };
  }, [session]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const handleSendMessage = async () => {
      if (!inputText.trim() || !session || !currentUser.id) return;
      
      // Future: Credit Check for premium features
      // if (!await chatService.deductCredits(currentUser.id, COSTS.PREMIUM_MSG, 'send_text')) return;

      await chatService.sendMessage(session.id, currentUser.id, inputText);
      setInputText('');
  };

  const handleTopUp = async () => {
      if (!currentUser.id) return;
      await chatService.topUpWallet(currentUser.id, 100); // Mock Stripe Success
      alert("Added 100 Credits (Mock Payment)");
      setShowWallet(false);
  };

  if (!isOpen) return null;

  return (
    <aside className="w-full md:w-[420px] flex flex-col glass-panel border-l border-[var(--panel-border)] shadow-2xl animate-in slide-in-from-right duration-500 bg-[var(--panel-bg)] z-[60] h-full fixed right-0 top-0 bottom-0">
        
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-transparent shrink-0 relative z-50">
            <div className="flex items-center gap-3">
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors"><ArrowLeftIcon className="w-5 h-5" /></button>
                <div className="flex flex-col">
                    <h2 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        {t.privateChat}
                    </h2>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Zero-Storage Mode</span>
                </div>
            </div>
            <WalletBadge credits={credits} onTopUp={() => setShowWallet(true)} />
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-transparent">
            {showWallet ? (
                <div className="absolute inset-0 bg-slate-900/95 z-50 p-8 flex flex-col items-center justify-center text-center animate-in fade-in">
                    <div className="w-20 h-20 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30 mb-6">
                        <span className="text-3xl">💎</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Prepaid Wallet</h3>
                    <p className="text-slate-400 text-sm mb-8">AI features and media require credits.<br/>No subscriptions. Pay as you go.</p>
                    
                    <div className="w-full space-y-3">
                        <button onClick={handleTopUp} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-900/50">
                            Buy 100 Credits ($1.00)
                        </button>
                        <button onClick={() => setShowWallet(false)} className="w-full py-4 bg-transparent text-slate-400 font-bold rounded-xl hover:bg-white/5 transition-all">
                            Cancel
                        </button>
                    </div>
                    <p className="mt-8 text-[10px] text-slate-600 uppercase tracking-widest">Secured by Stripe</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col h-full relative">
                    {/* DISCLAIMER BANNER */}
                    <div className="bg-yellow-500/10 border-b border-yellow-500/20 p-2 text-center">
                        <p className="text-[9px] text-yellow-200/80 font-bold uppercase tracking-widest">
                            ⚠️ Messages are NOT stored. History clears on refresh.
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
                        {messages.length === 0 && (
                            <div className="h-full flex items-center justify-center opacity-30">
                                <p className="text-xs uppercase font-bold tracking-widest">Encrypted Tunnel Established</p>
                            </div>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                                <EphemeralMessage msg={msg} />
                            </div>
                        ))}
                        <div ref={messagesEndRef} className="h-2" />
                    </div>
                </div>
            )}
        </div>

        {/* INPUT AREA */}
        <div className="p-3 bg-transparent border-t border-white/5 shrink-0 relative z-40 pb-6 backdrop-blur-md">
            <div className="flex items-end gap-2">
                <button className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors active:scale-90" onClick={() => alert("Photo costs 2 credits")}>
                    <CameraIcon className="w-6 h-6" />
                </button>
                <div className="flex-1 bg-white/5 border border-white/5 rounded-[1.5rem] flex items-center px-2 min-h-[50px] hover:bg-white/10 transition-all">
                    <input 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()} 
                        placeholder={language === 'ru' ? 'Сообщение...' : 'Message...'} 
                        className="flex-1 bg-transparent border-none outline-none py-3 px-3 text-sm text-white placeholder:text-slate-500 font-medium" 
                    />
                </div>
                <button onClick={handleSendMessage} className="p-3 bg-primary/40 border border-white/10 text-white rounded-full shadow-lg hover:bg-primary/60 active:scale-95 transition-all">
                    <PaperAirplaneIcon className="w-6 h-6" />
                </button>
            </div>
        </div>

        {/* PLAYER CONTROL BAR */}
        <div className="px-4 py-3 bg-[var(--player-bar-bg)] border-t border-[var(--panel-border)] relative shrink-0 z-30">
            <div className="flex items-center justify-center gap-6 py-2">
                <button onClick={onPrevStation} className="text-slate-400 hover:text-white transition-colors"><PreviousIcon className="w-5 h-5" /></button>
                <button onClick={onTogglePlay} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                    {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={onNextStation} className="text-slate-400 hover:text-white transition-colors"><NextIcon className="w-5 h-5" /></button>
            </div>
        </div>
    </aside>
  );
};

export default ChatPanel;
