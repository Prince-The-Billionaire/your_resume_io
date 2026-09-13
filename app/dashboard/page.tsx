'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Send,
  Mic,
  Square,
  Sparkles,
  User,
  Download,
  Keyboard,
  Home,
  FileText,
  Settings,
  Volume2,
  VolumeX,
  Menu,
  X,
  Loader2,
} from 'lucide-react';

const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

interface InterviewState {
  current_step: string;
  probing_count: number;
  resume_data: Record<string, any>;
  transcript: string[];
}

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
}

declare global {
  interface Window {
    AudioContext: any;
    webkitAudioContext: any;
  }
}

const INTERVIEW_STEP_URL =
  process.env.NEXT_PUBLIC_INTERVIEW_STEP_URL ||
  'https://danielprincewill14--ats-resume-desktop-backend-interview-6a8fe2.modal.run';

const TRANSCRIBE_URL =
  process.env.NEXT_PUBLIC_TRANSCRIBE_URL ||
  'https://danielprincewill14--ats-resume-desktop-backend-transcrib-832ec1.modal.run ';

const RENDER_PDF_URL =
  process.env.NEXT_PUBLIC_RENDER_PDF_URL ||
  'https://danielprincewill14--ats-resume-desktop-backend-render-pd-948bdd.modal.run';

const requestJson = async (url: string, options: RequestInit = {}) => {
  if (!url) {
    throw new Error('Backend URL is not configured. Add environment variables to your configuration.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(payload?.detail || payload?.error || `Request failed with status ${response.status}`);
    }

    return payload;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('The backend request timed out. Please check the Modal endpoint and network access.');
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Failed to reach the backend. Check the Modal URL, CORS settings, or environment variables.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// --- Audio Feedback Synth ---
const playTuningForkSound = (audioCtx: AudioContext | null) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.4);
  } catch (e) {
    console.error(e);
  }
};

const startBetterLoFiFocus = () => {
  const audio = new Audio('/Marble_and_Glass.mp3');
  audio.loop = true;
  audio.volume = 0.04;
  audio.preload = 'auto';

  return {
    audio,
    play: async () => {
      try {
        await audio.play();
      } catch (error) {
        console.error('Unable to start ambient audio', error);
      }
    },
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
    setVolume: (value: number) => {
      audio.volume = value;
    },
  };
};

export default function App() {
  const [hasEntered, setHasEntered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'ai',
      content:
        "Hi there! I'm your AI career coach. Let's build a Harvard-standard resume. To get started, what is your full name?",
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  // Recording & Waveform State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 35, 20, 45, 30, 15]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientSoundRef = useRef<{ stop: () => void; play: () => Promise<void>; setVolume: (value: number) => void; audio: HTMLAudioElement } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [interviewState, setInterviewState] = useState<InterviewState>({
    current_step: 'GREETING_NAME',
    probing_count: 0,
    resume_data: {},
    transcript: [],
  });

  // Parallax Setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 35, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 35, damping: 25 });
  const bgX = useTransform(smoothX, [-0.5, 0.5], ['15px', '-15px']);
  const bgY = useTransform(smoothY, [-0.5, 0.5], ['15px', '-15px']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;
    mouseX.set(e.clientX / innerWidth - 0.5);
    mouseY.set(e.clientY / innerHeight - 0.5);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const triggerAudioFeedback = () => {
    if (audioCtxRef.current) playTuningForkSound(audioCtxRef.current);
  };

  const handleEnterExperience = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    if (ctx.state === 'suspended') await ctx.resume();

    ambientSoundRef.current = startBetterLoFiFocus();
    await ambientSoundRef.current.play();
    playTuningForkSound(ctx);
    setHasEntered(true);
  };

  const toggleMute = () => {
    if (!ambientSoundRef.current) return;
    if (isMuted) {
      ambientSoundRef.current.setVolume(0.25);
      setIsMuted(false);
    } else {
      ambientSoundRef.current.setVolume(0);
      setIsMuted(true);
    }
  };

  // --- AUDIO RECORDING & WAVEFORM LOGIC ---
  const startRecording = async () => {
    triggerAudioFeedback();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Setup Web Audio Analyser for visualizer
      const audioCtx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        const normalized = Array.from(dataArray.slice(0, 8)).map(
          (val) => Math.max(12, Math.min(50, (val / 255) * 55))
        );
        setAudioLevels(normalized);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioForTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopRecording = () => {
    triggerAudioFeedback();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Convert audio blob to text via /transcribe endpoint and write to text box for user editing
  const sendAudioForTranscription = async (audioBlob: Blob) => {
    setIsTranscribing(true);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1];
        const data = await requestJson(TRANSCRIBE_URL, {
          method: 'POST',
          body: JSON.stringify({ audio_base64: base64Audio, mime_type: 'audio/webm' }),
        });

        if (data.transcript) {
          setInputValue((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
        }
      } catch (err: any) {
        console.error('Transcription error:', err);
      } finally {
        setIsTranscribing(false);
      }
    };
  };

  const handleSendTextMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const textToSend = inputValue.trim();
    if (!textToSend || isLoading) return;

    triggerAudioFeedback();
    setInputValue('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: textToSend }]);
    setIsLoading(true);

    await executeInterviewStep({ user_input: textToSend });
  };

  const executeInterviewStep = async (payload: { user_input: string }) => {
    try {
      const data = await requestJson(INTERVIEW_STEP_URL, {
        method: 'POST',
        body: JSON.stringify({
          state: interviewState,
          ...payload,
        }),
      });

      setInterviewState(data.state);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + '-ai', role: 'ai', content: data.ai_message },
      ]);

      if (data.is_complete && data.generated_resume) {
        await handleRenderPdf(data.generated_resume);
      }
    } catch (error: any) {
      console.error('Interview Step Error:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', content: `Error: ${error.message}. Please try again.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenderPdf = async (structuredJson: any) => {
    try {
      setMessages((prev) => [
        ...prev,
        { id: 'rendering-msg', role: 'ai', content: 'Drafting your perfectly formatted Harvard resume...' },
      ]);

      const data = await requestJson(RENDER_PDF_URL, {
        method: 'POST',
        body: JSON.stringify({ structured_json: structuredJson }),
      });
      setPdfBase64(data.pdf_base64);

      setMessages((prev) => [
        ...prev,
        { id: 'done-msg', role: 'ai', content: 'Resume complete! Preview updated on the right.' },
      ]);
    } catch (error) {
      console.error('PDF Render Error:', error);
    }
  };

  const downloadPdf = () => {
    triggerAudioFeedback();
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `${interviewState.resume_data?.personal_info?.name || 'Harvard'}_Resume.pdf`;
    link.click();
  };

  // Helper formatting for seconds
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isWarningTime = recordingSeconds >= 45;

  return (
    <div className="relative min-h-screen w-full bg-[#030304] text-white overflow-hidden selection:bg-purple-500/30">
      {/* ================= ENTRY MODAL ================= */}
      <AnimatePresence>
        {!hasEntered && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030304] text-white px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center gap-6 text-center max-w-sm"
            >
              <div className="p-4 rounded-full bg-white/[0.05] border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.08)]">
                <Volume2 className="w-6 h-6 text-slate-100 stroke-[1.5]" />
              </div>
              <div>
                <h3 className={`${cormorant.className} text-3xl font-normal text-slate-100 tracking-wide`}>
                  YourResume.io
                </h3>
                <p className="text-xs text-slate-200 mt-2 tracking-widest uppercase font-medium">
                  Continuous Lo-Fi Focus Sound Active
                </p>
              </div>

              <button
                onClick={handleEnterExperience}
                className="mt-2 px-8 py-3 rounded-full bg-white text-black font-medium text-sm tracking-wide hover:bg-slate-200 transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
              >
                Begin Interview Session
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN CONTAINER ================= */}
      <div onMouseMove={handleMouseMove} className="relative min-h-screen w-full flex flex-col justify-between">
        <motion.div
          style={{ x: bgX, y: bgY, scale: 1.05 }}
          className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center"
        >
          <img
            src="/dashboard.jpeg"
            alt="Background Environment"
            className="w-full h-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#030304]/40 to-[#030304]/95" />
        </motion.div>

        {/* ================= TOP NAVBAR & MOBILE HAMBURGER DOCK ================= */}
        <header className="relative z-30 w-full px-6 md:px-16 pt-8 pb-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={hasEntered ? { opacity: 1, y: 0 } : {}}
            className={`${cormorant.className} text-3xl md:text-4xl tracking-tight font-normal text-slate-100`}
          >
            YourResume.io
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Sound Mute Toggle */}
            <button
              onClick={toggleMute}
              className="p-3 rounded-full bg-black/40 border border-white/20 backdrop-blur-xl hover:bg-white/10 transition-colors text-slate-200"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Mobile Hamburger Dock Button */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-3 rounded-full bg-black/60 border border-white/25 backdrop-blur-2xl text-slate-100 hover:bg-white/10 transition-all"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {/* Mobile Horizontal Scaled Glass Bar */}
              <AnimatePresence>
                {isMobileMenuOpen && (
                  <motion.nav
                    initial={{ opacity: 0, scale: 0.85, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -10 }}
                    onMouseLeave={() => setIsMobileMenuOpen(false)}
                    className="absolute right-0 top-14 z-40 flex items-center gap-4 p-3 rounded-full bg-black/80 backdrop-blur-3xl border border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
                  >
                    <button className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10">
                      <Home className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10">
                      <FileText className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 rounded-full text-white bg-purple-500/30 border border-purple-400/50">
                      <Mic className="w-4 h-4 text-purple-100" />
                    </button>
                    <button className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10">
                      <Sparkles className="w-4 h-4" />
                    </button>
                    <button className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10">
                      <Settings className="w-4 h-4" />
                    </button>
                  </motion.nav>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* ================= MAIN INTERVIEW MODAL ================= */}
        <main className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-12 my-auto py-6 flex flex-col md:flex-row gap-8 items-center justify-center min-h-[82vh]">
          
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={hasEntered ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full transition-all duration-700 ease-in-out ${
              pdfBase64 ? 'md:w-[50%]' : 'max-w-3xl mx-auto'
            }`}
          >
            <div className="p-1 sm:p-1.5 rounded-[32px] border border-white/20 bg-white/[0.02] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              <div className="relative rounded-[28px] border border-white/30 bg-black/40 backdrop-blur-2xl overflow-hidden flex flex-col h-[520px] md:h-[580px] shadow-inner">
                
                {/* Header */}
                <div className="px-6 md:px-8 py-5 border-b border-white/15 bg-white/[0.04] flex items-center justify-between">
                  <div>
                    <h2 className={`${cormorant.className} text-3xl sm:text-4xl font-normal text-slate-100 tracking-wide`}>
                      Interview Session
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-[11px] font-semibold text-slate-200 tracking-widest uppercase">
                        AI Agent Active
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/25 backdrop-blur-md text-xs font-medium text-slate-100 tracking-wider">
                    {interviewState.current_step.replace('_', ' ')}
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center border shadow-lg ${
                            msg.role === 'user'
                              ? 'bg-purple-500/30 border-purple-400/50 text-purple-100'
                              : 'bg-white/15 border-white/25 text-white'
                          }`}
                        >
                          {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-purple-200" />}
                        </div>

                        <div
                          className={`max-w-[80%] text-sm sm:text-base font-normal leading-relaxed p-4 px-5 rounded-2xl backdrop-blur-md ${
                            msg.role === 'user'
                              ? 'bg-purple-900/50 text-slate-100 rounded-tr-none border border-purple-400/30'
                              : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/20'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                      <div className="w-9 h-9 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-200" />
                      </div>
                      <div className="bg-white/10 border border-white/20 rounded-2xl rounded-tl-none p-4 px-6 flex items-center gap-2">
                        <motion.div className="w-1.5 h-1.5 bg-slate-200 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                        <motion.div className="w-1.5 h-1.5 bg-slate-200 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                        <motion.div className="w-1.5 h-1.5 bg-slate-200 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Interactive Input Dock */}
                <div className="p-5 border-t border-white/15 bg-black/40 backdrop-blur-xl relative">
                  <form onSubmit={handleSendTextMessage} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[11px] uppercase font-semibold text-slate-200 tracking-wider">
                      <span className="flex items-center">
                        <Keyboard className="w-3.5 h-3.5 mr-2 text-purple-300" /> Response Text Box
                      </span>
                      {isTranscribing && (
                        <span className="flex items-center text-purple-300 font-mono gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin" /> Transcribing Audio...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center bg-black/50 border border-white/25 rounded-full pl-5 pr-2 py-1.5 focus-within:border-purple-400/60 transition-colors">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={
                            isTranscribing
                              ? 'Converting audio to text...'
                              : 'Type response or tap mic to record speech...'
                          }
                          disabled={isLoading || isTranscribing || !!pdfBase64}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-300"
                        />
                        <button
                          type="submit"
                          disabled={!inputValue.trim() || isLoading || isTranscribing}
                          className="p-2.5 rounded-full bg-purple-600 text-white hover:bg-purple-500 transition-all disabled:opacity-30 disabled:hover:bg-purple-600"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Integrated Voice Mic Controls */}
                      <div className="relative flex items-center justify-center flex-shrink-0">
                        <motion.div
                          layout
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="p-1 rounded-full border border-white/20 bg-white/[0.04] backdrop-blur-md z-10"
                        >
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isLoading || isTranscribing || !!pdfBase64}
                            aria-label="Microphone Action"
                            className={`relative flex items-center justify-center w-11 h-11 rounded-full border transition-colors duration-300 ${
                              isRecording
                                ? isWarningTime
                                  ? 'bg-red-600 border-red-400 text-white shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                                  : 'bg-purple-600 border-purple-300 text-white shadow-[0_0_20px_rgba(192,132,252,0.6)]'
                                : 'bg-white/10 border-white/30 text-white hover:border-purple-300/60 hover:scale-105'
                            }`}
                          >
                            {isRecording ? (
                              <Square className="w-4 h-4 fill-current" />
                            ) : (
                              <Mic className="w-5 h-5 text-purple-200" />
                            )}

                            {/* Blinking Recording Indicator */}
                            {isRecording && (
                              <span
                                className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full animate-ping ${
                                  isWarningTime ? 'bg-red-400' : 'bg-purple-300'
                                }`}
                              />
                            )}
                          </button>
                        </motion.div>

                        {/* Sliding Animated Waveform Visualizer */}
                        <AnimatePresence>
                          {isRecording && (
                            <motion.div
                              initial={{ opacity: 0, width: 0, x: -10 }}
                              animate={{ opacity: 1, width: 'auto', x: 0 }}
                              exit={{ opacity: 0, width: 0, x: -10 }}
                              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                              className="overflow-hidden flex items-center absolute right-14"
                            >
                              <div
                                className={`flex items-center gap-2.5 px-4 py-2 rounded-full border backdrop-blur-xl transition-colors duration-300 ${
                                  isWarningTime
                                    ? 'bg-red-950/80 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                                    : 'bg-black/80 border-white/30'
                                }`}
                              >
                                {/* Timer Display */}
                                <span
                                  className={`text-xs font-mono font-medium tracking-wider ${
                                    isWarningTime ? 'text-red-300 animate-pulse' : 'text-slate-100'
                                  }`}
                                >
                                  {formatTime(recordingSeconds)}
                                </span>

                                <div className="h-4 w-[1px] bg-white/30" />

                                {/* Frequency Audio Bars */}
                                <div className="flex items-center gap-1 h-6">
                                  {audioLevels.map((lvl, idx) => (
                                    <motion.div
                                      key={idx}
                                      animate={{ height: `${lvl * 0.6}px` }}
                                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                      className={`w-1 rounded-full ${
                                        isWarningTime ? 'bg-red-500' : 'bg-purple-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ================= PDF PREVIEW PANEL ================= */}
          <AnimatePresence>
            {pdfBase64 && (
              <motion.div
                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="w-full md:w-[50%] h-[520px] md:h-[580px] relative"
              >
                <div className="p-1 sm:p-1.5 rounded-[32px] border border-white/20 bg-white/[0.02] backdrop-blur-3xl h-full shadow-2xl">
                  <div className="relative rounded-[28px] border border-white/30 bg-black/40 overflow-hidden h-full flex flex-col">
                    <div className="absolute top-4 right-4 z-20">
                      <button
                        onClick={downloadPdf}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-medium shadow-lg transition-all active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                    </div>
                    <iframe
                      src={`data:application/pdf;base64,${pdfBase64}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-full rounded-[26px]"
                      title="Resume Preview"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* ================= FLOATING RIGHT SIDEBAR (DESKTOP DOCK) ================= */}
        <motion.aside
          initial={{ opacity: 0, x: 30 }}
          animate={hasEntered ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="fixed right-5 md:right-8 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col items-center gap-6 p-3.5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
        >
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Home"
            className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Home className="w-5 h-5 stroke-[1.5]" />
          </button>
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Documents"
            className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FileText className="w-5 h-5 stroke-[1.5]" />
          </button>
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Voice Active"
            className="relative p-2.5 rounded-full text-white bg-purple-500/30 shadow-[0_0_15px_rgba(192,132,252,0.4)] border border-purple-400/40"
          >
            <Mic className="w-5 h-5 stroke-[1.75] text-purple-200" />
          </button>
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="AI Features"
            className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Sparkles className="w-5 h-5 stroke-[1.5]" />
          </button>
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Settings"
            className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5 stroke-[1.5]" />
          </button>
        </motion.aside>
      </div>
    </div>
  );
}