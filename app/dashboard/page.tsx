'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Mic, MicOff, Sparkles, User, Download, Keyboard, 
  Home, Search, Shield, MapPin, Settings 
} from 'lucide-react';

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
  }
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      role: 'ai',
      content: "Hi there! I'm your AI career coach. Let's build a Harvard-standard resume. To get started, what is your full name?",
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [interviewState, setInterviewState] = useState<InterviewState>({
    current_step: "GREETING_NAME",
    probing_count: 0,
    resume_data: {},
    transcript: []
  });

  const requiresTyping = ['CONTACT_INFO', 'PROJECTS_GITHUB'].includes(interviewState.current_step);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
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

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setInputValue('');
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      const res = await fetch('https://YOUR_MODAL_WORKSPACE--ats-resume-desktop-backend-fastapi-app-dev.modal.run/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: interviewState, user_input: textToSend }),
      });

      // Front-end graceful degradation for Gemini API overload
      if (res.status === 503) {
        setMessages(prev => [...prev, { 
          id: Date.now().toString(), 
          role: 'ai', 
          content: "The network is a bit crowded right now. Could you repeat that last bit?" 
        }]);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to fetch from interview endpoint');
      }
      
      const data = await res.json();
      setInterviewState(data.state);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', content: data.ai_message }]);

      if (data.is_complete && data.generated_resume) {
        await handleRenderPdf(data.generated_resume);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), role: 'ai', 
        content: `I ran into an issue: ${error.message}. Could you try again?` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenderPdf = async (structuredJson: any) => {
    try {
      setMessages(prev => [...prev, { id: 'rendering-msg', role: 'ai', content: "Drafting your perfectly formatted PDF now. Hang tight..." }]);
      
      const res = await fetch('https://YOUR_MODAL_WORKSPACE--ats-resume-desktop-backend-fastapi-app-dev.modal.run/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structured_json: structuredJson }),
      });
      
      if (!res.ok) throw new Error('Failed to render PDF');
      const data = await res.json();
      setPdfBase64(data.pdf_base64);
      setMessages(prev => [...prev, { id: 'done-msg', role: 'ai', content: "All done! Take a look at your new resume on the right." }]);
    } catch (error) {
      console.error("PDF Render Error:", error);
    }
  };

  const downloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `${interviewState.resume_data?.personal_info?.name || 'Harvard'}_Resume.pdf`;
    link.click();
  };

  return (
    <div className="flex h-screen w-full relative overflow-hidden font-sans text-slate-100 bg-[#161618] items-center">
      
      {/* Aesthetic Mesh Background with Subtle Purple Accent */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-80 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#b49072]/20 blur-[130px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#9333ea]/15 blur-[160px] rounded-full mix-blend-screen" /> {/* Purple Accent */}
        <div className="absolute top-[30%] right-[20%] w-[40%] h-[40%] bg-[#d2c4b4]/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[60px]" />
      </div>

      {/* Floating Centered Sidebar */}
      <motion.aside 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        className="absolute z-20 left-[5px] top-1/2 -translate-y-1/2 h-[60%] w-20 md:w-24 flex flex-col items-center py-8 bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl rounded-[40px]"
      >
        <div className="flex flex-col items-center gap-6 mb-8 w-full">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-white/20 to-purple-500/20 flex items-center justify-center text-white shadow-lg border border-white/20">
            <Sparkles className="w-5 h-5 text-purple-200" />
          </div>
          <span className="text-[11px] font-medium text-white/60 tracking-[0.2em] -rotate-90 mt-14 mb-4 whitespace-nowrap">
            yourresume.io
          </span>
        </div>
        
        <nav className="flex flex-col gap-6 mt-auto mb-auto">
          <button className="p-3 rounded-2xl bg-white/10 text-purple-200 shadow-inner border border-white/10"><Home className="w-5 h-5" /></button>
          <button className="p-3 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all"><Search className="w-5 h-5" /></button>
          <button className="p-3 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all"><Settings className="w-5 h-5" /></button>
        </nav>
        
        <div className="mt-auto">
          <button className="p-3 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 transition-all"><User className="w-5 h-5" /></button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex p-4 pl-[100px] md:pl-[120px] md:pr-8 md:py-8 gap-6 h-[95vh] overflow-hidden">
        
        {/* Chat Interface with Fold-in Micro Animation */}
        <motion.div 
          initial={{ opacity: 0, rotateX: 15, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`flex flex-col h-full bg-white/5 backdrop-blur-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-[32px] overflow-hidden transition-all duration-500 ease-in-out ${
            pdfBase64 ? 'w-full md:w-[45%]' : 'w-full max-w-4xl mx-auto'
          }`}
          style={{ transformPerspective: 1000 }}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg text-white tracking-wide">Interview Session</h1>
              <p className="text-xs text-purple-300/70 uppercase tracking-widest mt-1">AI Agent Active</p>
            </div>
            <span className="px-4 py-1.5 text-xs font-medium bg-purple-500/10 text-purple-200 rounded-full border border-purple-500/20 backdrop-blur-md">
              {interviewState.current_step.replace('_', ' ')}
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-lg border ${
                    msg.role === 'user' ? 'bg-purple-500/20 border-purple-500/30 text-purple-100' : 'bg-black/40 border-white/10 text-white/90'
                  }`}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>

                  <div className={`max-w-[80%] leading-relaxed text-[15px] p-5 shadow-xl backdrop-blur-md ${
                    msg.role === 'user' 
                      ? 'bg-purple-500/10 text-white rounded-3xl rounded-tr-sm border border-purple-500/20' 
                      : 'bg-black/20 text-white/90 rounded-3xl rounded-tl-sm border border-white/5'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-white/90">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="bg-black/20 border border-white/5 shadow-xl backdrop-blur-md rounded-3xl rounded-tl-sm p-5 flex items-center gap-2">
                  <motion.div className="w-2 h-2 bg-purple-400/50 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                  <motion.div className="w-2 h-2 bg-purple-400/50 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                  <motion.div className="w-2 h-2 bg-purple-400/50 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-black/10 border-t border-white/5 backdrop-blur-xl rounded-b-[32px]">
            {requiresTyping ? (
              <motion.form 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSendMessage}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center text-[10px] font-semibold text-purple-300/60 uppercase tracking-wider">
                  <Keyboard className="w-3 h-3 mr-2" /> Keyboard Input Required
                </div>
                <div className="flex items-center bg-black/30 border border-white/10 rounded-2xl pl-5 pr-2 py-2 focus-within:ring-1 focus-within:ring-purple-500/50 focus-within:border-purple-500/50 transition-all shadow-inner">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={interviewState.current_step === 'CONTACT_INFO' ? "Enter Email and Phone Number..." : "Enter GitHub Link..."}
                    disabled={isLoading || !!pdfBase64}
                    className="flex-1 bg-transparent border-none focus:outline-none text-[15px] text-white placeholder:text-white/30 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading || !!pdfBase64}
                    className="w-12 h-12 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 flex items-center justify-center disabled:opacity-50 transition-all ml-2 backdrop-blur-md"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center gap-4">
                
                {/* Editable Voice Input Field */}
                {(inputValue || isListening) && (
                   <div className="w-full flex items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-inner focus-within:border-purple-500/30 transition-all">
                     <textarea
                       value={inputValue}
                       onChange={(e) => setInputValue(e.target.value)}
                       placeholder={isListening ? "Listening..." : "Edit your text here..."}
                       className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-white p-3 resize-none placeholder:text-white/30"
                       rows={2}
                     />
                     {!isListening && inputValue && (
                        <button onClick={(e) => handleSendMessage(e)} className="p-4 bg-purple-500/20 text-purple-100 rounded-xl hover:bg-purple-500/30 transition-all self-end border border-purple-500/10">
                          <Send className="w-5 h-5" />
                        </button>
                     )}
                   </div>
                )}
                
                <button
                  onClick={toggleListening}
                  disabled={isLoading || !!pdfBase64}
                  className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-500 shadow-2xl ${
                    isListening ? 'bg-red-500/80 text-white shadow-[0_0_40px_rgba(239,68,68,0.3)] scale-110' : 'bg-white/5 border border-white/10 text-white hover:bg-purple-500/10 hover:border-purple-500/30 hover:scale-105'
                  } disabled:opacity-50 disabled:hover:scale-100 backdrop-blur-md`}
                >
                  {isListening && (
                    <motion.div 
                      className="absolute inset-0 rounded-full border border-red-400/50"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  {isListening ? <MicOff className="w-7 h-7 z-10" /> : <Mic className="w-7 h-7 z-10" />}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* PDF PREVIEW PANEL */}
        <AnimatePresence>
          {pdfBase64 && (
            <motion.div 
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200, delay: 0.1 }}
              className="hidden md:flex flex-1 flex-col h-full relative"
            >
              <div className="absolute top-6 right-6 z-20">
                <button 
                  onClick={downloadPdf}
                  className="flex items-center gap-2 bg-black/40 hover:bg-purple-500/20 backdrop-blur-xl border border-white/10 hover:border-purple-500/30 text-white px-6 py-3 rounded-2xl font-medium text-sm shadow-2xl transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
              </div>
              
              <div className="w-full h-full rounded-[32px] shadow-2xl bg-[#e5e7eb] overflow-hidden border border-white/10 relative z-10">
                <iframe 
                  src={`data:application/pdf;base64,${pdfBase64}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-full h-full rounded-[32px]"
                  title="Resume Preview"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}