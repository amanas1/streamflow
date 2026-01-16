import { useRef, useEffect, useCallback, useState } from 'react';
import { FxSettings } from '../types';

export const useAudioChain = (audioRef: React.RefObject<HTMLAudioElement>, fxSettings: FxSettings, eqGains: number[]) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const pannerNodeRef = useRef<StereoPannerNode | null>(null);
    
    // FX Nodes
    const wetGainNodeRef = useRef<GainNode | null>(null);
    const dryGainNodeRef = useRef<GainNode | null>(null);
    const reverbNodeRef = useRef<ConvolverNode | null>(null);
    const filtersRef = useRef<BiquadFilterNode[]>([]);

    const [isReady, setIsReady] = useState(false);

    // Initialize Audio Context (Lazy)
    const initAudio = useCallback(() => {
        if (audioContextRef.current || !audioRef.current) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass({ sampleRate: 44100 });
            audioContextRef.current = ctx;

            const source = ctx.createMediaElementSource(audioRef.current);
            sourceNodeRef.current = source;

            // Reverb Setup (Impulse Response)
            const reverb = ctx.createConvolver();
            reverbNodeRef.current = reverb;
            const rate = ctx.sampleRate;
            const length = rate * 1.2; 
            const decay = 2.0;
            const impulse = ctx.createBuffer(2, length, rate);
            for (let channel = 0; channel < 2; channel++) {
                const data = impulse.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
                }
            }
            reverb.buffer = impulse;

            // Gain Nodes for FX Mix
            const dryGain = ctx.createGain(); 
            const wetGain = ctx.createGain(); 
            wetGain.gain.value = 0; 
            dryGainNodeRef.current = dryGain;
            wetGainNodeRef.current = wetGain;

            // EQ Filters
            const frequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
            const filters = frequencies.map(freq => {
                const f = ctx.createBiquadFilter();
                f.type = 'peaking';
                f.frequency.value = freq;
                f.Q.value = 1;
                f.gain.value = 0;
                return f;
            });
            filtersRef.current = filters;

            // Spatial
            const panner = ctx.createStereoPanner();
            pannerNodeRef.current = panner;

            // Analyser
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048; 
            analyserNodeRef.current = analyser;

            // Connect Graph
            // Source -> Dry/Wet Split
            source.connect(dryGain);
            source.connect(reverb);
            reverb.connect(wetGain);

            // Recombine -> EQ Chain
            dryGain.connect(filters[0]);
            wetGain.connect(filters[0]);

            let node: AudioNode = filters[0];
            for (let i = 1; i < filters.length; i++) {
                node.connect(filters[i]);
                node = filters[i];
            }

            // EQ -> Panner -> Analyser -> Destination
            node.connect(panner);
            panner.connect(analyser);
            analyser.connect(ctx.destination);
            
            setIsReady(true);
            
        } catch (e) {
            console.error("Audio Engine Initialization Failed:", e);
        }
    }, [audioRef]);

    // Apply FX Settings
    useEffect(() => {
        if (wetGainNodeRef.current && dryGainNodeRef.current) {
            const reverbAmt = Math.max(0, Math.min(1, fxSettings.reverb));
            wetGainNodeRef.current.gain.setTargetAtTime(reverbAmt, audioContextRef.current?.currentTime || 0, 0.1);
            dryGainNodeRef.current.gain.setTargetAtTime(1 - (reverbAmt * 0.4), audioContextRef.current?.currentTime || 0, 0.1);
        }
        if (audioRef.current) {
            // Safe clamp for speed
            const speed = Math.max(0.5, Math.min(2.0, fxSettings.speed));
            audioRef.current.playbackRate = speed;
        }
    }, [fxSettings]);

    // Apply EQ Settings
    useEffect(() => {
        filtersRef.current.forEach((f, i) => { 
            if (eqGains[i] !== undefined) {
                f.gain.setTargetAtTime(eqGains[i], audioContextRef.current?.currentTime || 0, 0.1);
            }
        }); 
    }, [eqGains]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, []);

    const resumeContext = async () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    };

    return { 
        analyserNode: analyserNodeRef.current, 
        pannerNode: pannerNodeRef.current,
        initAudio,
        resumeContext,
        isReady
    };
};