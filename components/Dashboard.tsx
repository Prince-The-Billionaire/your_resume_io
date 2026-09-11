'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  Upload, Edit3, Download, Trash2, FileText, Maximize2, X, 
  Loader2, PanelRightOpen, AlertCircle, Plus, User, 
  GraduationCap, Briefcase, Code, Sparkles, MessageSquare, Mic, 
  Square, CheckCheck, Wand2, PanelRightClose
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const MODAL_ENDPOINTS = {
  parsePdf: "https://danielprincewill14--ats-resume-desktop-backend-parse-pdf.modal.run",
  generateMaster: "https://danielprincewill14--ats-resume-desktop-backend-generate--18b782.modal.run",
  renderPdf: "https://danielprincewill14--ats-resume-desktop-backend-render-pd-948bdd.modal.run",
  transcribeAudio: "https://danielprincewill14--ats-resume-desktop-backend-transcrib-832ec1.modal.run",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'implicit',
  },
});

interface MasterResume {
  personal_info: {
    name: string;
    email: string;
    phone?: string;
    linkedin: string;
    github?: string;
  };
  technical_skills: Array<{ category_name: string; subcategories: string[] }>;
  education: Array<{ degree: string; institution: string; grade?: string; duration: string }>;
  work_experience: Array<{ company: string; role: string; duration: string; achievements: string[] }>;
  key_projects: Array<{ title: string; link?: string; achievements: string[] }>;
}

const base64ToBlobUrl = (base64: string, contentType = 'application/pdf'): string => {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return URL.createObjectURL(blob);
};

interface DashboardProps {
  user: any;
  session: any;
}

export default function Dashboard({ user, session }: DashboardProps) {
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }, []);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);

  const [masterResume, setMasterResume] = useState<MasterResume | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState<'personal' | 'education' | 'experience' | 'projects' | 'skills'>('personal');
  const [formData, setFormData] = useState<MasterResume | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFetchedMasterRef = useRef<boolean>(false);

  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ id: number; sender: 'user' | 'agent'; text: string; time: string }[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token || session?.access_token;

    if (!accessToken) {
      throw new Error("User not authenticated. Please log in with Google.");
    }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || `API Request Failed with status ${response.status}`);
    }
    return response.json();
  }, [session]);

  const triggerPdfRender = useCallback(async (resumeData: MasterResume) => {
    setErrorMessage(null);
    try {
      const data = await authFetch(MODAL_ENDPOINTS.renderPdf, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ master_resume: resumeData })
      });
      setPdfBase64(data.pdf_base64);
    } catch (err: any) {
      setErrorMessage(`PDF Render error: ${err.message}`);
    }
  }, [authFetch]);

  useEffect(() => {
    const handleResize = () => {
      setIsChatOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stopRecordingAndTranscribe = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    setIsRecording(false);

    if (mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }

    mediaRecorderRef.current.stop();

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg' });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        setIsLoading(true);

        try {
          const data = await authFetch(MODAL_ENDPOINTS.transcribeAudio, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio_base64: base64Audio })
          });

          if (data.transcript) {
            setChatInput(data.transcript);
          }
        } catch (err: any) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
    };
  }, [authFetch]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordTime((prev) => {
          if (prev >= 60) {
            stopRecordingAndTranscribe();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, stopRecordingAndTranscribe]);

  useEffect(() => {
    if (pdfBase64) {
      const url = base64ToBlobUrl(pdfBase64);
      setPdfBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfBlobUrl(null);
    }
  }, [pdfBase64]);

  useEffect(() => {
    const fetchLatestMasterResume = async () => {
      if (!user || hasFetchedMasterRef.current) return;
      hasFetchedMasterRef.current = true;

      setIsLoading(true);
      setLoadingText("Fetching stored Master Resume from Supabase...");
      setErrorMessage(null);

      try {
        const { data, error } = await supabase
          .from('web_users')
          .select(`
            id,
            master_resumes (
              structured_json,
              created_at
            )
          `)
          .eq('auth_id', user.id)
          .maybeSingle();

        if (error) {
          console.error("[SUPABASE ERROR]", error.message);
          return;
        }

        const masterResumes = data?.master_resumes;
        if (masterResumes && masterResumes.length > 0) {
          const latestRecord = masterResumes.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          const parsedResume = latestRecord.structured_json as MasterResume;
          setMasterResume(parsedResume);
          setFormData(JSON.parse(JSON.stringify(parsedResume)));

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now(),
              sender: 'agent',
              text: `Loaded existing master resume for ${parsedResume.personal_info?.name || 'your profile'}. Rendering PDF preview...`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);

          setLoadingText("Rendering Harvard PDF template...");
          await triggerPdfRender(parsedResume);
        }
      } catch (err: any) {
        console.error("[SUPABASE EXCEPTION]", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestMasterResume();
  }, [user, triggerPdfRender]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setIsLoading(true);
      setLoadingText("Extracting resume structure via Modal backend...");
      setErrorMessage(null);

      try {
        const formDataPayload = new FormData();
        formDataPayload.append("file", file);

        const data = await authFetch(MODAL_ENDPOINTS.parsePdf, {
          method: "POST",
          body: formDataPayload
        });

        const parsedJson = data.structured_json || data.master_resume;
        setMasterResume(parsedJson);
        setFormData(JSON.parse(JSON.stringify(parsedJson)));
        setPdfBase64(data.pdf_base64);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: 'agent',
            text: `Successfully parsed ${file.name}! Updated Master Resume saved.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch (err: any) {
        setErrorMessage(`Error parsing PDF: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  const handleGenerateFromScratch = async () => {
    const textToProcess = chatInput.trim() || messages.map(m => `${m.sender}: ${m.text}`).join('\n');
    if (!textToProcess) return;

    setIsLoading(true);
    setLoadingText("Generating structured Master Resume from dictation...");

    try {
      const response = await authFetch(MODAL_ENDPOINTS.generateMaster, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dictation: textToProcess })
      });

      if (response.structured_json || response.master_resume) {
        const parsedJson = response.structured_json || response.master_resume;
        setMasterResume(parsedJson);
        setFormData(JSON.parse(JSON.stringify(parsedJson)));
        if (response.pdf_base64) setPdfBase64(response.pdf_base64);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'agent',
          text: "Generated structured Master Resume and updated live preview!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(`Generation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'user',
        text: chatInput,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  const handleSaveStructuredEdit = async () => {
    if (!formData) return;
    setMasterResume(formData);
    setIsEditModalOpen(false);
    setIsLoading(true);
    setLoadingText("Compiling PDF from updated section fields...");
    await triggerPdfRender(formData);
    setIsLoading(false);
  };

  const handleDownloadPdf = () => {
    if (!pdfBlobUrl) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = `${masterResume?.personal_info?.name?.replace(/\s+/g, '_') || 'resume'}_harvard.pdf`;
    link.click();
  };

  const clearFile = () => {
    setUploadedFile(null);
    setPdfBase64(null);
    setPdfBlobUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openStructuredEditModal = () => {
    if (masterResume) {
      setFormData(JSON.parse(JSON.stringify(masterResume)));
      setActiveEditSection('personal');
      setIsEditModalOpen(true);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "User";

  return (
    <div className="flex h-full w-full gap-x-6 relative">
      <div className="flex-1 flex flex-col gap-y-8 md:gap-y-10 pb-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-700 text-xs md:text-sm shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-red-100 rounded-lg text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-slate-500">Welcome back,</h2>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2 mt-0.5">
              <span className="italic">{userName}</span> <span className="text-2xl">👋</span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Build and tailor Harvard-style resumes powered by Modal backends.</p>
          </div>

          {!isChatOpen && (
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <PanelRightOpen className="w-4 h-4 text-violet-600" />
              Open AI Assistant
            </button>
          )}
        </div>

        <div className="flex flex-col gap-y-12">
          <motion.div whileHover={{ y: -2 }} className="relative rounded-3xl p-6 md:p-8 flex items-center justify-between overflow-hidden shadow-sm min-h-[220px] border border-violet-100/80">
            <Image src="/illustration_boy.jpg" alt="Background" fill className="object-cover object-center z-0" />
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#F8F9FD] via-[#F8F9FD]/60 to-transparent" />

            <div className="relative z-10 max-w-lg space-y-3">
              <h3 className="text-xl md:text-2xl font-serif font-bold text-slate-900">Let's get started</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm">
                Upload an existing resume to parse into structured sections, or dictate details directly to the agent.
              </p>

              <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              {!uploadedFile ? (
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className="mt-4 inline-flex items-center gap-2 bg-violet-600 text-white font-medium text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-md hover:bg-violet-700 transition-all disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  Upload Resume (PDF)
                </motion.button>
              ) : (
                <div className="mt-4 inline-flex items-center gap-3 bg-white/90 backdrop-blur px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <FileText className="w-5 h-5 text-violet-600" />
                  <span className="text-xs md:text-sm font-medium text-slate-700 truncate max-w-[150px]">{uploadedFile.name}</span>
                  <button onClick={clearFile} className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <div className="bg-white border border-slate-200/70 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg md:text-xl font-serif font-bold text-slate-900">Live Harvard PDF Preview</h3>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 border border-slate-200/60">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {masterResume ? `${masterResume.personal_info?.name?.replace(/\s+/g, '_')}_master.pdf` : 'resume_draft.pdf'}
                </span>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button 
                  onClick={openStructuredEditModal} 
                  disabled={!masterResume} 
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors disabled:opacity-40"
                >
                  <Edit3 className="w-3.5 h-3.5 text-violet-600" />
                  Edit Resume Sections
                </button>
                <button onClick={handleDownloadPdf} disabled={!pdfBlobUrl} className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-40">
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden shadow-inner relative">
              <div className="bg-slate-900 px-5 py-3 flex items-center justify-between text-slate-300 text-xs border-b border-slate-700">
                <div className="flex items-center gap-4">
                  <span>Page {pageNumber} of {numPages || 1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPdfScale(s => Math.max(0.4, s - 0.1))} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">-</button>
                  <span>{Math.round(pdfScale * 100)}%</span>
                  <button onClick={() => setPdfScale(s => Math.min(1.6, s + 0.1))} className="px-2 py-1 bg-slate-800 rounded hover:bg-slate-700">+</button>
                </div>
                <div className="flex items-center gap-4"><Maximize2 className="w-4 h-4" /></div>
              </div>

              <div className="p-4 md:p-8 bg-slate-700/50 flex justify-center min-h-[550px] md:min-h-[650px] items-center overflow-auto">
                {isLoading ? (
                  <div className="flex flex-col items-center space-y-3 text-white">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                    <p className="text-xs md:text-sm font-medium">{loadingText}</p>
                  </div>
                ) : pdfBlobUrl ? (
                  <Document
                    file={pdfBlobUrl}
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                    loading={
                      <div className="flex items-center gap-2 text-white text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        Loading PDF canvas...
                      </div>
                    }
                    error={
                      <div className="text-red-400 text-xs text-center p-4">
                        Failed to render PDF canvas. Try clicking "Download PDF" directly.
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={pdfScale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      className="shadow-2xl rounded overflow-hidden"
                    />
                  </Document>
                ) : (
                  <div className="text-slate-400 text-center space-y-2">
                    <FileText className="w-12 h-12 mx-auto opacity-40" />
                    <p className="text-xs md:text-sm">Upload a PDF or dictated text to render dynamic PDF canvas here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isChatOpen && (
          <motion.aside 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.2 }}
            className="fixed lg:static inset-y-0 right-0 z-30 w-full sm:w-[360px] lg:w-[380px] border-l border-slate-200/70 bg-white flex flex-col p-6 shrink-0 h-full shadow-2xl lg:shadow-none rounded-3xl lg:rounded-none"
          >
            <div className="flex-none flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <Image src="/logo.jpg" alt="AI Agent" width={40} height={40} className="rounded-full object-cover shadow-sm border border-slate-100" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI Career Agent</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] text-slate-400">Modal Backend Connected</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button onClick={() => setMessages([])} className="hover:text-slate-600 transition-colors p-1.5" title="Clear Chat">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setIsChatOpen(false)} className="hover:text-slate-600 transition-colors p-1.5" title="Close Panel">
                  <PanelRightClose className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 my-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <p className="text-xs md:text-sm text-slate-400">Voice record or type details to generate or tailor your resume.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-violet-100/80 text-violet-950 rounded-br-sm' : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-bl-sm'}`}>
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                      {msg.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-violet-500" />}
                    </div>
                  </div>
                ))
              )}

              {isRecording && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-amber-700 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      Recording audio...
                    </span>
                    <span className="text-xs font-mono text-amber-600">
                      00:{recordTime.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-none space-y-4 pt-4 border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type or record dictation..."
                  className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400"
                />
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={handleToggleRecord}
                  className={`p-2.5 rounded-xl shadow-md transition-colors shrink-0 flex items-center justify-center ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-violet-600 hover:bg-violet-700 text-white'
                  }`}
                >
                  {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                </motion.button>
              </form>

              <motion.button
                onClick={handleGenerateFromScratch}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
                className="w-full py-3 bg-violet-600 text-white rounded-xl font-medium text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                Generate From Dictation
              </motion.button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && formData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.96 }} 
              className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-serif font-bold text-slate-900 text-lg md:text-xl">Edit Master Resume</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Select a section on the left to review or edit its fields.</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-56 bg-slate-50 border-r border-slate-100 p-3 flex md:flex-col gap-1.5 shrink-0 overflow-x-auto md:overflow-y-auto">
                  {[
                    { id: 'personal', label: 'Personal Info', icon: User },
                    { id: 'education', label: 'Education', icon: GraduationCap },
                    { id: 'experience', label: 'Work Experience', icon: Briefcase },
                    { id: 'projects', label: 'Key Projects', icon: Code },
                    { id: 'skills', label: 'Skills & Tools', icon: Sparkles },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeEditSection === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveEditSection(tab.id as any)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap md:whitespace-normal ${
                          isActive 
                            ? 'bg-violet-600 text-white shadow-md shadow-violet-200' 
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex-1 p-6 overflow-y-auto bg-white space-y-6">
                  {activeEditSection === 'personal' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Personal & Contact Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                          <input
                            type="text"
                            value={formData.personal_info.name || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              personal_info: { ...formData.personal_info, name: e.target.value }
                            })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-violet-500"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                          <input
                            type="email"
                            value={formData.personal_info.email || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              personal_info: { ...formData.personal_info, email: e.target.value }
                            })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-violet-500"
                            placeholder="john@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                          <input
                            type="text"
                            value={formData.personal_info.phone || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              personal_info: { ...formData.personal_info, phone: e.target.value }
                            })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-violet-500"
                            placeholder="+1 234 567 890"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">LinkedIn Profile</label>
                          <input
                            type="text"
                            value={formData.personal_info.linkedin || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              personal_info: { ...formData.personal_info, linkedin: e.target.value }
                            })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-violet-500"
                            placeholder="linkedin.com/in/username"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">GitHub Profile (Optional)</label>
                          <input
                            type="text"
                            value={formData.personal_info.github || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              personal_info: { ...formData.personal_info, github: e.target.value }
                            })}
                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-violet-500"
                            placeholder="github.com/username"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeEditSection === 'education' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Education Credentials</h4>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            education: [
                              ...(formData.education || []),
                              { degree: '', institution: '', duration: '', grade: '' }
                            ]
                          })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Education
                        </button>
                      </div>

                      {formData.education?.map((edu, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl relative space-y-3">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formData.education];
                              updated.splice(idx, 1);
                              setFormData({ ...formData, education: updated });
                            }}
                            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Degree / Qualification</label>
                              <input
                                type="text"
                                value={edu.degree || ''}
                                onChange={(e) => {
                                  const updated = [...formData.education];
                                  updated[idx].degree = e.target.value;
                                  setFormData({ ...formData, education: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Institution</label>
                              <input
                                type="text"
                                value={edu.institution || ''}
                                onChange={(e) => {
                                  const updated = [...formData.education];
                                  updated[idx].institution = e.target.value;
                                  setFormData({ ...formData, education: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Duration</label>
                              <input
                                type="text"
                                value={edu.duration || ''}
                                onChange={(e) => {
                                  const updated = [...formData.education];
                                  updated[idx].duration = e.target.value;
                                  setFormData({ ...formData, education: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                placeholder="Nov 2021 – Present"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Grade / Honors (Optional)</label>
                              <input
                                type="text"
                                value={edu.grade || ''}
                                onChange={(e) => {
                                  const updated = [...formData.education];
                                  updated[idx].grade = e.target.value;
                                  setFormData({ ...formData, education: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                placeholder="1st Class"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeEditSection === 'experience' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Work Experience</h4>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            work_experience: [
                              ...(formData.work_experience || []),
                              { role: '', company: '', duration: '', achievements: [''] }
                            ]
                          })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Role
                        </button>
                      </div>

                      {formData.work_experience?.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl relative space-y-3">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formData.work_experience];
                              updated.splice(idx, 1);
                              setFormData({ ...formData, work_experience: updated });
                            }}
                            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Job Title / Role</label>
                              <input
                                type="text"
                                value={exp.role || ''}
                                onChange={(e) => {
                                  const updated = [...formData.work_experience];
                                  updated[idx].role = e.target.value;
                                  setFormData({ ...formData, work_experience: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Company Name</label>
                              <input
                                type="text"
                                value={exp.company || ''}
                                onChange={(e) => {
                                  const updated = [...formData.work_experience];
                                  updated[idx].company = e.target.value;
                                  setFormData({ ...formData, work_experience: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Duration</label>
                              <input
                                type="text"
                                value={exp.duration || ''}
                                onChange={(e) => {
                                  const updated = [...formData.work_experience];
                                  updated[idx].duration = e.target.value;
                                  setFormData({ ...formData, work_experience: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Achievements & Impact Bullet Points</label>
                            {exp.achievements?.map((ach, aIdx) => (
                              <div key={aIdx} className="flex items-center gap-2 mb-2">
                                <input
                                  type="text"
                                  value={ach}
                                  onChange={(e) => {
                                    const updated = [...formData.work_experience];
                                    updated[idx].achievements[aIdx] = e.target.value;
                                    setFormData({ ...formData, work_experience: updated });
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formData.work_experience];
                                    updated[idx].achievements.splice(aIdx, 1);
                                    setFormData({ ...formData, work_experience: updated });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formData.work_experience];
                                updated[idx].achievements.push('');
                                setFormData({ ...formData, work_experience: updated });
                              }}
                              className="text-[11px] font-semibold text-violet-600 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Achievement Bullet
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeEditSection === 'projects' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Key Projects</h4>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            key_projects: [
                              ...(formData.key_projects || []),
                              { title: '', link: '', achievements: [''] }
                            ]
                          })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Project
                        </button>
                      </div>

                      {formData.key_projects?.map((proj, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl relative space-y-3">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formData.key_projects];
                              updated.splice(idx, 1);
                              setFormData({ ...formData, key_projects: updated });
                            }}
                            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Project Title</label>
                              <input
                                type="text"
                                value={proj.title || ''}
                                onChange={(e) => {
                                  const updated = [...formData.key_projects];
                                  updated[idx].title = e.target.value;
                                  setFormData({ ...formData, key_projects: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-slate-600 mb-1">Project Link (Optional)</label>
                              <input
                                type="text"
                                value={proj.link || ''}
                                onChange={(e) => {
                                  const updated = [...formData.key_projects];
                                  updated[idx].link = e.target.value;
                                  setFormData({ ...formData, key_projects: updated });
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Key Contributions & Highlights</label>
                            {proj.achievements?.map((ach, aIdx) => (
                              <div key={aIdx} className="flex items-center gap-2 mb-2">
                                <input
                                  type="text"
                                  value={ach}
                                  onChange={(e) => {
                                    const updated = [...formData.key_projects];
                                    updated[idx].achievements[aIdx] = e.target.value;
                                    setFormData({ ...formData, key_projects: updated });
                                  }}
                                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formData.key_projects];
                                    updated[idx].achievements.splice(aIdx, 1);
                                    setFormData({ ...formData, key_projects: updated });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formData.key_projects];
                                updated[idx].achievements.push('');
                                setFormData({ ...formData, key_projects: updated });
                              }}
                              className="text-[11px] font-semibold text-violet-600 hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Project Highlight
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeEditSection === 'skills' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h4 className="text-sm font-bold text-slate-900">Technical Skill Categories</h4>
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            technical_skills: [
                              ...(formData.technical_skills || []),
                              { category_name: '', subcategories: [] }
                            ]
                          })}
                          className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-100 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Category
                        </button>
                      </div>

                      {formData.technical_skills?.map((cat, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl relative space-y-3">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...formData.technical_skills];
                              updated.splice(idx, 1);
                              setFormData({ ...formData, technical_skills: updated });
                            }}
                            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Category Title</label>
                            <input
                              type="text"
                              value={cat.category_name || ''}
                              onChange={(e) => {
                                const updated = [...formData.technical_skills];
                                updated[idx].category_name = e.target.value;
                                setFormData({ ...formData, technical_skills: updated });
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                              placeholder="e.g. Languages or Backend"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">Skills (Comma-Separated)</label>
                            <input
                              type="text"
                              value={cat.subcategories?.join(', ') || ''}
                              onChange={(e) => {
                                const updated = [...formData.technical_skills];
                                updated[idx].subcategories = e.target.value.split(',').map(s => s.trimStart());
                                setFormData({ ...formData, technical_skills: updated });
                              }}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              placeholder="Python, TypeScript, Node.js"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
                <span className="text-xs text-slate-400">All adjustments update your live PDF automatically.</span>
                <div className="flex gap-3">
                  <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSaveStructuredEdit} className="px-5 py-2 text-xs md:text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 rounded-xl shadow-md shadow-violet-200 transition-colors">
                    Save & Re-Render PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}