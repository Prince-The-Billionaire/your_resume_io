'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Sparkles, Home, Search, Settings, User, 
  CheckCircle2, FileText, Layers, Briefcase, ChevronRight 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
    const router = useRouter();
  return (
    <div className="relative w-full h-screen bg-[#0a0a0c] overflow-hidden font-serif text-slate-100 selection:bg-purple-500/30">
      
      {/* 1. Background Image Placeholder & Abstract Mesh */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Replace src with your actual image filename in the public folder */}
        <Image 
          src="/resume_bg.png" 
          alt="Luxurious Background" 
          fill 
          priority
          className="object-cover opacity-20 mix-blend-overlay"
        />
        
        {/* Subtle Gradients */}
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-purple-900/15 blur-[160px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[55%] h-[55%] bg-[#b49072]/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-purple-500/5 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[40px]" />
      </div>

      {/* 2. Floating Sidebar */}
      <motion.aside 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="absolute z-40 left-[5px] top-1/2 -translate-y-1/2 h-[60%] w-20 md:w-24 flex flex-col items-center py-8 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[40px] overflow-hidden"
      >
        <div className="flex flex-col items-center gap-6 mb-8 w-full">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/10 to-purple-500/20 flex items-center justify-center text-white shadow-lg border border-white/10">
            <Sparkles className="w-5 h-5 text-purple-200" />
          </div>
          <span className="text-[11px] font-medium text-white/70 tracking-[0.2em] -rotate-90 mt-16 mb-6 whitespace-nowrap lowercase">
            yourresume.io
          </span>
        </div>
        
        <nav className="flex flex-col gap-6 mt-auto mb-auto">
          <button className="p-3 rounded-2xl bg-white/10 text-purple-200 shadow-inner border border-white/10"><Home className="w-5 h-5" /></button>
          <button className="p-3 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all"><Search className="w-5 h-5" /></button>
          <button className="p-3 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all"><Settings className="w-5 h-5" /></button>
        </nav>
        
        <div className="mt-auto">
          <button className="p-3 rounded-2xl text-white/30 hover:text-white hover:bg-white/10 transition-all"><User className="w-5 h-5" /></button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="relative z-10 w-full h-full">
        
        {/* 3. Top Right ATS Progress Tab (Circular) */}
        <motion.div 
          initial={{ opacity: 0, y: -20, rotateX: 10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="absolute top-8 right-8 md:top-12 md:right-16 z-30 w-[300px] md:w-[340px] p-5 rounded-3xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] group overflow-hidden"
        >
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
            initial={{ x: '-150%' }}
            whileHover={{ x: '150%' }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-sans font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-purple-400" />
                ATS Scanner
              </span>
              <div className="p-3 rounded-xl bg-black/20 border border-white/5 mt-1">
                <p className="text-[11px] text-white/50 leading-relaxed font-sans">
                  <span className="text-purple-300/80">Role:</span> SWE<br/>
                  <span className="text-purple-300/80">Keywords:</span> Next.js, Python<br/>
                  <span className="text-green-400/90 mt-1 inline-block">Match Verified</span>
                </p>
              </div>
            </div>

            {/* Circular Progress Bar */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-lg" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="6" 
                  fill="none" 
                />
                <motion.circle 
                  cx="50" cy="50" r="40" 
                  stroke="url(#purple-gradient)" 
                  strokeWidth="6" 
                  fill="none" 
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="purple-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#e9d5ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-xl text-purple-200">100</span>
                <span className="text-[8px] font-sans text-white/40 uppercase tracking-widest">Score</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. Central Graphic (Stylized Document) */}
        {/* <motion.div 
          initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
          animate={{ opacity: 1, scale: 1, rotateY: -5 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 w-[250px] md:w-[350px] h-[350px] md:h-[480px] rounded-2xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 backdrop-blur-md shadow-[0_0_80px_rgba(147,51,234,0.05)] flex items-center justify-center pointer-events-none"
          style={{ transformPerspective: 1000 }}
        >
          <div className="absolute inset-4 border border-white/5 rounded-xl border-dashed opacity-50" />
          <Image width={350} height={480} src={'/image.png'} alt="Background" className="w-full h-full object-cover" />
        </motion.div> */}

        {/* 5. Big Typography: Top Left */}
        <div className="absolute top-[18%] left-[120px] md:left-[15%] z-20 pointer-events-none">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-[4.5rem] md:text-[6.5rem] lg:text-[9rem] leading-[0.9] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gray-50 via-gray-300 to-gray-500 drop-shadow-2xl"
          >
            Harvard-style
            <br />
            <span className="italic opacity-90 pr-4 font-light">resume</span>
          </motion.h1>
        </div>

        {/* 6. Big Typography & CTA: Bottom Right */}
        <div className="absolute bottom-[12%] right-[5%] md:right-[10%] z-20 flex flex-col items-end text-right">
          <motion.h2 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="text-[2.5rem] md:text-[4rem] lg:text-[5.5rem] leading-[1] tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gray-50 via-gray-300 to-gray-500 drop-shadow-2xl"
          >
            In 5 minutes,
            <br />
            <span className="italic opacity-90 pr-2 font-light">no typing.</span>
          </motion.h2>
          
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            onClick={() => router.push('/dashboard')}
            className="mt-8 px-8 py-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-full text-white/90 text-sm font-sans font-medium tracking-wide backdrop-blur-xl transition-all group overflow-hidden relative flex items-center gap-3 shadow-[0_0_30px_rgba(147,51,234,0.15)]"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
              initial={{ x: '-150%' }}
              whileHover={{ x: '150%' }}
              
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
            <span className="relative z-10">Get your resume now for free, no sign up</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative z-10 group-hover:bg-purple-500/40 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        </div>

        {/* 7. Bottom Left Glassmorphic Tabs (Templates) */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="absolute bottom-10 md:bottom-14 left-[120px] md:left-[15%] z-30 flex flex-wrap gap-4 font-sans"
        >
          {[
            { name: 'Executive', icon: Briefcase },
            { name: 'Creative', icon: Layers },
            { name: 'Standard', icon: FileText }
          ].map((tab, i) => (
            <motion.button 
              key={tab.name}
              whileHover={{ y: -5 }}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-2xl border border-white/10 shadow-lg text-white/60 hover:text-purple-200 transition-colors relative overflow-hidden group"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                initial={{ x: '-150%' }}
                whileHover={{ x: '150%' }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <tab.icon className="w-4 h-4 relative z-10" />
              <span className="text-xs font-medium tracking-wider relative z-10">{tab.name}</span>
            </motion.button>
          ))}
        </motion.div>

      </main>
    </div>
  );
}