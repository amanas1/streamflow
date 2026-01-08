
import React, { useState, useEffect } from 'react';
import { XMarkIcon } from './Icons';

interface IslamicAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_ATTEMPTS = 3;
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Hours

const IslamicAuthModal: React.FC<IslamicAuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  // Load state from local storage when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();
    const storedBlock = localStorage.getItem('streamflow_islamic_blocked_until');
    const storedAttempts = localStorage.getItem('streamflow_islamic_attempts');

    if (storedBlock) {
        const blockTime = parseInt(storedBlock, 10);
        if (now < blockTime) {
            setBlockedUntil(blockTime);
            return;
        } else {
            // Block expired
            localStorage.removeItem('streamflow_islamic_blocked_until');
            localStorage.removeItem('streamflow_islamic_attempts');
            setAttempts(0);
            setBlockedUntil(null);
        }
    } else if (storedAttempts) {
        setAttempts(parseInt(storedAttempts, 10));
    } else {
        setAttempts(0);
    }
    
    setAnswer('');
    setError(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blockedUntil) return;
    
    // Normalize input: remove special chars, spaces, lowercase
    const normalized = answer.toLowerCase().trim().replace(/[^a-zа-яё]/g, '');
    
    const validRoots = [
        'бисмил', 
        'бисмыл', 
        'bismil', 
        'бисмиля',
        'бисмыля'
    ];

    const isValid = validRoots.some(root => normalized.startsWith(root));

    if (isValid) {
      // Success: Clear history
      localStorage.removeItem('streamflow_islamic_attempts');
      localStorage.removeItem('streamflow_islamic_blocked_until');
      onSuccess();
    } else {
      // Failure
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      localStorage.setItem('streamflow_islamic_attempts', newAttempts.toString());
      setError(true);

      if (newAttempts >= MAX_ATTEMPTS) {
          const blockTime = Date.now() + BLOCK_DURATION_MS;
          localStorage.setItem('streamflow_islamic_blocked_until', blockTime.toString());
          setBlockedUntil(blockTime);
          
          // Close automatically after showing the block message for a moment
          setTimeout(() => {
              onClose();
          }, 3000);
      }
    }
  };

  const isBlocked = blockedUntil !== null;
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
      
      <div className={`relative w-full max-w-md glass-panel p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-in zoom-in duration-300 border ${isBlocked ? 'border-red-900/50' : 'border-emerald-900/50'}`}>
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isBlocked ? 'bg-red-900/30 border-red-500/20' : 'bg-emerald-900/30 border-emerald-500/20'}`}>
                <span className="text-2xl">{isBlocked ? '🔒' : '☪️'}</span>
            </div>

            <h2 className={`text-xl font-bold ${isBlocked ? 'text-red-200' : 'text-emerald-100'}`}>
                {isBlocked ? 'Доступ заблокирован' : 'Вопрос для доступа'}
            </h2>

            {isBlocked ? (
                <div className="space-y-4">
                    <p className="text-red-200/70 text-sm font-medium">
                        Вы исчерпали лимит попыток. Доступ к этому разделу закрыт на 24 часа.
                    </p>
                    <div className="p-3 bg-red-950/50 rounded-xl border border-red-900/50">
                        <p className="text-[10px] text-red-400 uppercase font-bold tracking-widest">
                            Вы можете слушать другие станции
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    <p className="text-emerald-200/70 text-sm font-medium">
                        Перед едой, что говорят мусульмане?
                    </p>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        <input 
                            type="text" 
                            value={answer}
                            onChange={(e) => { setAnswer(e.target.value); setError(false); }}
                            placeholder="Ваш ответ..."
                            className={`w-full bg-black/40 border ${error ? 'border-red-500' : 'border-emerald-900/50 focus:border-emerald-500'} rounded-2xl px-5 py-4 outline-none transition-all text-center text-white placeholder:text-emerald-800/50 font-semibold`}
                            autoFocus
                        />
                        
                        {error && (
                            <p className="text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                                Неверно. Осталось попыток: {attemptsLeft}
                            </p>
                        )}

                        <button 
                            type="submit"
                            className="w-full py-4 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
                        >
                            Подтвердить
                        </button>
                    </form>
                    
                    <p className="text-[10px] text-emerald-800/60 uppercase tracking-widest">
                        Священный контент
                    </p>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default IslamicAuthModal;
