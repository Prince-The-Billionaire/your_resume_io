'use client';

import React, { useState, useRef } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Home,
  FileText,
  Mic,
  Sparkles,
  Settings,
  ArrowRight,
  Volume2,
  Router,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Load Cormorant Garamond for luxury high-contrast editorial serif
const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

// ================= WEB AUDIO API SYNTHESIZERS =================
const playTuningForkSound = (audioCtx: AudioContext | null) => {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    // Pure 880Hz (A5) tuning fork frequency
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);

    // Initial attack and sharp exponential decay
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
  } catch (e) {
    console.error(e);
  }
};

const playAmbientLoFiChime = (audioCtx: AudioContext | null) => {
  if (!audioCtx) return;
  try {
    // Warm lo-fi harmonic frequencies (F# minor 9th sound)
    const notes = [185.0, 277.18, 329.63, 440.0, 554.37];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      // Lowpass filter for warm lo-fi feel
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.4 + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 5.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime + idx * 0.08);
      osc.stop(audioCtx.currentTime + 5.5);
    });
  } catch (e) {
    console.error(e);
  }
};

// ================= GLIDING LETTER ANIMATION =================
const AnimatedGlidingText = ({
  text,
  className = '',
  delayOffset = 0,
}: {
  text: string;
  className?: string;
  delayOffset?: number;
}) => {
  const words = text.split(' ');
  let globalCharIndex = 0;

  return (
    <span className={`inline-block ${className}`}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap mr-[0.22em]">
          {word.split('').map((char, charIndex) => {
            const currentIndex = globalCharIndex++;
            return (
              <motion.span
                key={charIndex}
                initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{
                  duration: 1.1,
                  ease: [0.16, 1, 0.3, 1], // Luxury smooth easing curve
                  delay: delayOffset + currentIndex * 0.022,
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            );
          })}
        </span>
      ))}
    </span>
  );
};

export default function HeroSection() {
  const [hasEntered, setHasEntered] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Parallax Setup
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 25 });
  const bgX = useTransform(smoothX, [-0.5, 0.5], ['20px', '-20px']);
  const bgY = useTransform(smoothY, [-0.5, 0.5], ['20px', '-20px']);
  const router = useRouter();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;
    mouseX.set(e.clientX / innerWidth - 0.5);
    mouseY.set(e.clientY / innerHeight - 0.5);
  };

  const handleEnterStage = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    playAmbientLoFiChime(ctx);
    playTuningForkSound(ctx);
    setHasEntered(true);
  };

  const triggerButtonAudio = () => {
    if (audioCtxRef.current) {
      playTuningForkSound(audioCtxRef.current);
    }
  };

  // Pure Silver Metallic Text Gradient
  const silverGradientStyle: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(180deg, #FFFFFF 0%, #E2E8F0 45%, #94A3B8 85%, #64748B 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };

  const handleClick = () => {
    triggerButtonAudio();
    router.push('/dashboard');
  }

  return (
    <div className="relative min-h-screen w-full bg-[#040405] text-white overflow-hidden font-sans selection:bg-white/20">
      {/* ================= STAGE ENTRY MODAL / SOUND INITIALIZER ================= */}
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
                <h3 className={`${cormorant.className} text-3xl font-normal text-slate-100 tracking-wide`}>
                  YourResume.io
                </h3>
                <p className="text-xs text-slate-400 mt-2 tracking-widest uppercase">
                  Sound On • Premium Audio Experience
                </p>
              </div>

              <button
                onClick={handleEnterStage}
                className="mt-2 px-8 py-3 rounded-full bg-white text-black font-medium text-sm tracking-wide hover:bg-slate-200 transition-all duration-300 shadow-[0_0_25px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
              >
                Enter Experience
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MAIN HERO SECTION ================= */}
      <section
        onMouseMove={handleMouseMove}
        className="relative min-h-screen w-full flex flex-col justify-between"
      >
        {/* BACKGROUND IMAGE PARALLAX CONTAINER */}
        <motion.div
          style={{ x: bgX, y: bgY, scale: 1.05 }}
          className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center"
        >
          {/* REPLACE WITH YOUR ACTUAL BACKGROUND IMAGE SOURCE */}
          <img
            src="/hero_bg_p.jpg"
            alt="Abstract Resume Background"
            className="w-full h-full object-cover object-center opacity-90"
          />
          <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#040405]/30 to-[#040405]/95" />
        </motion.div>

        {/* TOP NAVBAR / BRAND LOGO */}
        <header className="relative z-10 w-full px-8 sm:px-12 md:px-16 lg:px-20 pt-8 pb-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={hasEntered ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={`${cormorant.className} text-3xl sm:text-4xl tracking-tight font-normal text-slate-100`}
          >
            YourResume.io
          </motion.div>
        </header>

        {/* MAIN HERO CONTENT DISPLAY */}
        <div className="relative z-10 w-full max-w-[1700px] mx-auto px-8 sm:px-12 md:px-16 lg:px-20 my-auto pt-4 pb-12 flex flex-col justify-between min-h-[78vh]">
          
          {/* TOP LEFT SECTION: Headline + Subcopy + Button */}
          <div className="max-w-xl lg:max-w-2xl flex flex-col gap-6">
            {/* Main Top Left Headline */}
            <h1
              className={`${cormorant.className} text-6xl sm:text-7xl md:text-8xl lg:text-[104px] xl:text-[112px] leading-[0.88] tracking-tight font-normal select-none`}
              style={silverGradientStyle}
            >
              {hasEntered && (
                <>
                  <AnimatedGlidingText text="Your top-tier" delayOffset={0.2} />
                  <br />
                  <AnimatedGlidingText text="resume," delayOffset={0.5} />
                </>
              )}
            </h1>

            {/* Subcopy Panning Left */}
            <motion.p
              initial={{ opacity: 0, x: -50 }}
              animate={hasEntered ? { opacity: 1, x: 0 } : {}}
              transition={{
                duration: 1.0,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.8,
              }}
              className="text-slate-300/85 text-sm sm:text-base font-light leading-relaxed max-w-sm mt-2"
            >
              Stop typing, just speak your experience, and our AI crafts a
              meticulously vetted, boardroom-ready resume completely free.
            </motion.p>

            {/* BUTTON WITH OUTER THIN SILVER RING */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={hasEntered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 1.0, ease: 'easeOut' }}
              className="pt-3"
            >
              {/* External Thin Line Outer Ring Container */}
              <div className="inline-block p-1 rounded-full border border-white/20 backdrop-blur-sm transition-all duration-300 hover:border-white/40">
                <button
                  onMouseEnter={triggerButtonAudio}
                  onClick={handleClick}
                  className="group relative inline-flex items-center gap-3 px-7 py-3 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/30 hover:border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.06)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-300 text-slate-100 font-normal text-sm sm:text-base"
                >
                  <span className="relative z-10 tracking-wide">Build my resume</span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform duration-300" />
                  {/* Micro Gloss Glow Highlight */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </button>
              </div>
            </motion.div>
          </div>

          {/* BOTTOM RIGHT SECTION: Headline */}
          <div className="self-end text-right mt-14 md:mt-0 max-w-3xl">
            <h2
              className={`${cormorant.className} text-6xl sm:text-7xl md:text-8xl lg:text-[104px] xl:text-[112px] leading-[0.88] tracking-tight font-normal select-none`}
              style={silverGradientStyle}
            >
              {hasEntered && (
                <>
                  <AnimatedGlidingText text="built by voice," delayOffset={0.7} />
                  <br />
                  <AnimatedGlidingText text="in seven minutes." delayOffset={1.0} />
                </>
              )}
            </h2>
          </div>
        </div>

        {/* RIGHT FLOATING GLASS SIDEBAR (DOCK) */}
        <motion.aside
          initial={{ opacity: 0, x: 40 }}
          animate={hasEntered ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, delay: 1.2, ease: 'easeOut' }}
          className="fixed right-5 md:right-8 top-1/2 -translate-y-1/2 z-30 hidden sm:flex flex-col items-center gap-6 p-3.5 rounded-full bg-black/25 backdrop-blur-2xl border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.6)]"
        >
          <button
            onMouseEnter={triggerButtonAudio}
            aria-label="Home"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
          >
            <Home className="w-5 h-5 stroke-[1.5]" />
          </button>

          <button
            onMouseEnter={triggerButtonAudio}
            aria-label="Documents"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
          >
            <FileText className="w-5 h-5 stroke-[1.5]" />
          </button>

          {/* Active Voice Button */}
          <button
            onMouseEnter={triggerButtonAudio}
            aria-label="Voice Input"
            className="relative p-2.5 rounded-full text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/40"
          >
            <Mic className="w-5 h-5 stroke-[1.75] text-slate-100" />
          </button>

          <button
            onMouseEnter={triggerButtonAudio}
            aria-label="AI Features"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
          >
            <Sparkles className="w-5 h-5 stroke-[1.5]" />
          </button>

          <button
            onMouseEnter={triggerButtonAudio}
            aria-label="Settings"
            className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200"
          >
            <Settings className="w-5 h-5 stroke-[1.5]" />
          </button>
        </motion.aside>
      </section>
    </div>
  );
}