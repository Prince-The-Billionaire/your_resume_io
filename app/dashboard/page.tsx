'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Sparkles,
  User,
  Download,
  Keyboard,
  Home,
  FileText,
  Settings,
  Volume2,
  VolumeX,
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
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    AudioContext: any;
    webkitAudioContext: any;
  }
}

// ================= WEB AUDIO API SYNTHESIZERS =================
const playTuningForkSound = (audioCtx: AudioContext | null) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note

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

const startBetterLoFiFocus = (audioCtx: AudioContext) => {
  const now = audioCtx.currentTime;
  const master = audioCtx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.065, now + 3);

  // Warm pad frequencies (F#m9 + extensions, slightly stretched)
  const freqs = [92.5, 138.6, 185, 220, 277.2, 330, 370, 415.3];

  const oscs: OscillatorNode[] = [];
  const filters: BiquadFilterNode[] = [];

  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();

    osc.type = i < 3 ? "sine" : "triangle";
    osc.frequency.value = f;
    osc.detune.value = (Math.random() - 0.5) * 12; // organic drift

    filter.type = "lowpass";
    filter.frequency.value = 320 + i * 25;
    filter.Q.value = 0.8;

    g.gain.value = 0.011 + i * 0.0012;

    osc.connect(filter);
    filter.connect(g);
    g.connect(master);

    osc.start();
    oscs.push(osc);
    filters.push(filter);
  });

  // Slow filter + volume breathing
  const lfo = audioCtx.createOscillator();
  const lfoDepth = audioCtx.createGain();
  lfo.frequency.value = 0.06;
  lfoDepth.gain.value = 55;

  lfo.connect(lfoDepth);
  filters.forEach((f) => lfoDepth.connect(f.frequency));
  lfo.start();

  // Soft noise bed (very gentle rain texture)
  const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 3, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;

  const nFilter = audioCtx.createBiquadFilter();
  nFilter.type = "lowpass";
  nFilter.frequency.value = 1400;
  nFilter.Q.value = 0.5;

  const nGain = audioCtx.createGain();
  nGain.gain.value = 0.007;

  noiseSrc.connect(nFilter);
  nFilter.connect(nGain);
  nGain.connect(master);
  noiseSrc.start();

  // Soft sub pulse every ~3.2 seconds
  const sub = audioCtx.createOscillator();
  const subG = audioCtx.createGain();
  sub.type = "sine";
  sub.frequency.value = 46;
  subG.gain.value = 0;

  sub.connect(subG);
  subG.connect(master);
  sub.start();

  const pulse = (t: number) => {
    subG.gain.setValueAtTime(0, t);
    subG.gain.linearRampToValueAtTime(0.028, t + 0.12);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  };

  // Schedule pulses
  let nextPulse = now + 2;
  const schedule = () => {
    pulse(nextPulse);
    nextPulse += 3.15 + Math.random() * 0.3;
    setTimeout(schedule, 2800);
  };
  schedule();

  master.connect(audioCtx.destination);

  return {
    stop: () => {
      const t = audioCtx.currentTime;
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.exponentialRampToValueAtTime(0.00001, t + 2.5);
      setTimeout(() => {
        oscs.forEach((o) => o.stop());
        noiseSrc.stop();
        sub.stop();
        lfo.stop();
      }, 2600);
    },
    masterGain: master,
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
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientSoundRef = useRef<{ stop: () => void; masterGain: GainNode } | null>(null);

  const [interviewState, setInterviewState] = useState<InterviewState>({
    current_step: 'GREETING_NAME',
    probing_count: 0,
    resume_data: {},
    transcript: [],
  });

  const requiresTyping = ['CONTACT_INFO', 'PROJECTS_GITHUB'].includes(
    interviewState.current_step
  );

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInputValue(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const handleEnterExperience = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    ambientSoundRef.current = startBetterLoFiFocus(ctx);
    playTuningForkSound(ctx);
    setHasEntered(true);
  };

  const toggleMute = () => {
    if (!ambientSoundRef.current || !audioCtxRef.current) return;
    if (isMuted) {
      ambientSoundRef.current.masterGain.gain.setValueAtTime(
        0.065,
        audioCtxRef.current.currentTime
      );
      setIsMuted(false);
    } else {
      ambientSoundRef.current.masterGain.gain.setValueAtTime(
        0.0,
        audioCtxRef.current.currentTime
      );
      setIsMuted(true);
    }
  };

  const triggerAudioFeedback = () => {
    if (audioCtxRef.current) {
      playTuningForkSound(audioCtxRef.current);
    }
  };

  const toggleListening = () => {
    triggerAudioFeedback();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputValue('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const textToSend = inputValue.trim();
    if (!textToSend || isLoading) return;

    triggerAudioFeedback();

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setInputValue('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: textToSend },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch(
        'https://danielprincewill14--ats-resume-desktop-backend-interview-6a8fe2.modal.run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: interviewState, user_input: textToSend }),
        }
      );

      if (res.status === 503) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: 'ai',
            content:
              'The network is a bit crowded right now. Could you repeat that last bit?',
          },
        ]);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to fetch from interview endpoint');
      }

      const data = await res.json();
      setInterviewState(data.state);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'ai', content: data.ai_message },
      ]);

      if (data.is_complete && data.generated_resume) {
        await handleRenderPdf(data.generated_resume);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: `I ran into an issue: ${error.message}. Could you try again?`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenderPdf = async (structuredJson: any) => {
    try {
      setMessages((prev) => [
        ...prev,
        {
          id: 'rendering-msg',
          role: 'ai',
          content: 'Drafting your perfectly formatted PDF now. Hang tight...',
        },
      ]);

      const res = await fetch(
        'https://danielprincewill14--ats-resume-desktop-backend-render-pd-948bdd.modal.run',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structured_json: structuredJson }),
        }
      );

      if (!res.ok) throw new Error('Failed to render PDF');
      const data = await res.json();
      setPdfBase64(data.pdf_base64);
      setMessages((prev) => [
        ...prev,
        {
          id: 'done-msg',
          role: 'ai',
          content: 'All done! Take a look at your new resume on the right.',
        },
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
    link.download = `${
      interviewState.resume_data?.personal_info?.name || 'Harvard'
    }_Resume.pdf`;
    link.click();
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030304] text-white overflow-hidden selection:bg-purple-500/30">
      {/* ================= STAGE AUDIO ENTRY MODAL ================= */}
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
              <div className="p-4 rounded-full bg-white/[0.03] border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                <Volume2 className="w-6 h-6 text-slate-300 stroke-[1.5]" />
              </div>
              <div>
                <h3
                  className={`${cormorant.className} text-3xl font-normal text-slate-100 tracking-wide`}
                >
                  YourResume.io
                </h3>
                <p className="text-xs text-slate-400 mt-2 tracking-widest uppercase">
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

      {/* ================= BACKGROUND IMAGE PARALLAX ================= */}
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

        {/* ================= TOP NAVBAR / LOGO ================= */}
        <header className="relative z-20 w-full px-8 md:px-16 pt-8 pb-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={hasEntered ? { opacity: 1, y: 0 } : {}}
            className={`${cormorant.className} text-3xl md:text-4xl tracking-tight font-normal text-slate-100`}
          >
            YourResume.io
          </motion.div>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleMute}
            className="p-3 rounded-full bg-black/30 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors text-slate-300"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </header>

        {/* ================= MAIN CONTENT DISPLAY ================= */}
        <main className="relative z-10 w-full max-w-[1600px] mx-auto px-6 md:px-12 my-auto py-6 flex flex-col md:flex-row gap-8 items-center justify-center min-h-[82vh]">
          
          {/* GLASS INTERVIEW MODAL WITH EXTERNAL WIREFRAME LINE */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={hasEntered ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full transition-all duration-700 ease-in-out ${
              pdfBase64 ? 'md:w-[50%]' : 'max-w-3xl mx-auto'
            }`}
          >
            {/* Outer Thin Line Wireframe Frame */}
            <div className="p-1 sm:p-1.5 rounded-[32px] border border-white/20 bg-white/[0.02] backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
              {/* Inner Glass Box */}
              <div className="relative rounded-[28px] border border-white/30 bg-black/30 backdrop-blur-2xl overflow-hidden flex flex-col h-[520px] md:h-[580px] shadow-inner">
                
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <h2
                      className={`${cormorant.className} text-3xl sm:text-4xl font-normal text-slate-100 tracking-wide`}
                    >
                      Interview Session
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-[11px] font-medium text-slate-300 tracking-widest uppercase">
                        AI Agent Active
                      </span>
                    </div>
                  </div>

                  {/* Step Pill Badge */}
                  <div className="px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/20 backdrop-blur-md text-xs font-light text-slate-200 tracking-wider">
                    {interviewState.current_step.replace('_', ' ')}
                  </div>
                </div>

                {/* Messages Feed Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-4 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center border shadow-lg ${
                            msg.role === 'user'
                              ? 'bg-purple-500/20 border-purple-400/40 text-purple-100'
                              : 'bg-white/10 border-white/20 text-white'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-purple-200" />
                          )}
                        </div>

                        <div
                          className={`max-w-[80%] text-sm sm:text-base font-light leading-relaxed p-4 px-5 rounded-2xl backdrop-blur-md ${
                            msg.role === 'user'
                              ? 'bg-purple-900/30 text-slate-100 rounded-tr-none border border-purple-400/20'
                              : 'bg-white/[0.06] text-slate-200 rounded-tl-none border border-white/10'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-4"
                    >
                      <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-200" />
                      </div>
                      <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-none p-4 px-6 flex items-center gap-2">
                        <motion.div
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 bg-slate-300 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Bottom Input Area */}
                <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl relative">
                  {requiresTyping ? (
                    <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
                      <div className="flex items-center text-[10px] uppercase font-medium text-slate-400 tracking-widest">
                        <Keyboard className="w-3 h-3 mr-2 text-purple-300" /> Keyboard Input Required
                      </div>
                      <div className="flex items-center bg-white/[0.05] border border-white/20 rounded-full pl-5 pr-2 py-1.5">
                        <input
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={
                            interviewState.current_step === 'CONTACT_INFO'
                              ? 'Enter Email and Phone Number...'
                              : 'Enter GitHub Link...'
                          }
                          disabled={isLoading || !!pdfBase64}
                          className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-slate-400"
                        />
                        <button
                          type="submit"
                          onMouseEnter={triggerAudioFeedback}
                          disabled={!inputValue.trim() || isLoading}
                          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-40"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      {(inputValue || isListening) && (
                        <div className="w-full mb-3 flex items-center bg-white/[0.05] border border-white/20 rounded-2xl p-2">
                          <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={isListening ? 'Listening...' : 'Edit response...'}
                            className="flex-1 bg-transparent text-sm text-white focus:outline-none p-2 resize-none placeholder:text-slate-400"
                            rows={2}
                          />
                          {!isListening && inputValue && (
                            <button
                              onClick={(e) => handleSendMessage(e)}
                              className="p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* CENTER ORB MICROPHONE BUTTON WITH EXTERNAL RING */}
                      <div className="relative group p-1.5 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md">
                        <button
                          onClick={toggleListening}
                          onMouseEnter={triggerAudioFeedback}
                          disabled={isLoading || !!pdfBase64}
                          aria-label="Toggle Microphone"
                          className={`relative flex items-center justify-center w-16 h-16 rounded-full border transition-all duration-300 shadow-[0_0_25px_rgba(192,132,252,0.2)] ${
                            isListening
                              ? 'bg-red-500/80 border-red-300 text-white shadow-[0_0_35px_rgba(239,68,68,0.5)] scale-105'
                              : 'bg-white/10 border-white/30 text-white hover:border-purple-300/60 hover:scale-105'
                          }`}
                        >
                          {isListening ? (
                            <MicOff className="w-6 h-6 z-10" />
                          ) : (
                            <Mic className="w-6 h-6 z-10 text-purple-200" />
                          )}
                          {/* Ambient Glow Internal Sheen */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-purple-500/20 to-transparent pointer-events-none" />
                        </button>
                      </div>
                    </div>
                  )}
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

        {/* ================= FLOATING RIGHT SIDEBAR (DOCK) ================= */}
        <motion.aside
          initial={{ opacity: 0, x: 30 }}
          animate={hasEntered ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="fixed right-5 md:right-8 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col items-center gap-6 p-3.5 rounded-full bg-black/20 backdrop-blur-2xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Home"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Home className="w-5 h-5 stroke-[1.5]" />
          </button>

          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Documents"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <FileText className="w-5 h-5 stroke-[1.5]" />
          </button>

          {/* Active Voice Dock Button */}
          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Voice Active"
            className="relative p-2.5 rounded-full text-white bg-white/10 shadow-[0_0_15px_rgba(192,132,252,0.4)] border border-purple-400/30"
          >
            <Mic className="w-5 h-5 stroke-[1.75] text-purple-200" />
          </button>

          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="AI Features"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Sparkles className="w-5 h-5 stroke-[1.5]" />
          </button>

          <button
            onMouseEnter={triggerAudioFeedback}
            aria-label="Settings"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5 stroke-[1.5]" />
          </button>
        </motion.aside>
      </div>
    </div>
  );
}