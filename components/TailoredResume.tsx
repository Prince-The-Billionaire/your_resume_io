'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Scissors, Search, Trash2, FileText, ChevronDown, 
  ExternalLink, FileCode, Mail, Mic, MicOff, Check, 
  Sparkles, Loader2, ArrowRight, Lightbulb, Clock,
  Maximize2, Minimize2, Download, HelpCircle, X
} from 'lucide-react';

const GENERATE_QUESTIONS_URL = "https://danielprincewill14--ats-tailor-service-generate-questions.modal.run";
const TAILOR_RESUME_URL = "https://danielprincewill14--ats-tailor-service-tailor-resume-endpoint.modal.run";

interface StarQuestion {
  id: number;
  question: string;
  context_target: string;
}

interface AtsDiagnostics {
  ats_score: number;
  matching_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
}

interface TailoredFile {
  id: string;
  name: string;
  size: string;
  date: string;
  ats_score?: number;
}

export default function TailorResume({ user, supabase }: { user: any; supabase?: any }) {
  const [jobDescription, setJobDescription] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResumes, setSearchResumes] = useState('');
  const [searchLetters, setSearchLetters] = useState('');

  const [isDock, setIsDock] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [activeTailoredId, setActiveTailoredId] = useState<string | null>(null);

  const [dockStep, setDockStep] = useState<'idle' | 'interview' | 'cover_letter_prompt' | 'completed'>('idle');

  const [questions, setQuestions] = useState<StarQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});

  const [generatedDockFiles, setGeneratedDockFiles] = useState<{ name: string; type: string; url: string }[]>([]);

  const [atsDiagnostics, setAtsDiagnostics] = useState<AtsDiagnostics | null>({
    ats_score: 84,
    matching_keywords: ['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'PostgreSQL'],
    missing_keywords: ['GraphQL', 'Kubernetes', 'CI/CD'],
    suggestions: [
      'Quantify your backend optimizations (e.g., latency reductions or throughput metrics).',
      'Incorporate standard industry titles matching the targeted job description.',
      'Add bullet points detailing Modal serverless deployments.'
    ]
  });

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "Prince Daniel";

  const [resumes, setResumes] = useState<TailoredFile[]>([
    { id: '1', name: 'Resume tailored for Product Manager.pdf', size: '215 KB', date: 'May 25, 2026', ats_score: 88 },
    { id: '2', name: 'Resume tailored for Data Analyst.pdf', size: '198 KB', date: 'May 24, 2026', ats_score: 79 },
    { id: '3', name: 'Resume tailored for Software Engineer.pdf', size: '210 KB', date: 'May 22, 2026', ats_score: 93 },
    { id: '4', name: 'Resume tailored for Systems Engineer.pdf', size: '223 KB', date: 'May 20, 2026', ats_score: 85 }
  ]);

  const [coverLetters, setCoverLetters] = useState<TailoredFile[]>([
    { id: '1', name: 'Cover letter for Product Manager.docx', size: '34 KB', date: 'May 25, 2026' },
    { id: '2', name: 'Cover letter for Software Engineer.docx', size: '33 KB', date: 'May 22, 2026' }
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron && (window as any).electron.ipcRenderer) {
      const unsubscribe = (window as any).electron.ipcRenderer.on(
        'global-hotkey-triggered',
        (_: any, data: { text: string; isDockMode?: boolean; autoExecute?: boolean }) => {
          if (data && data.text) {
            setJobDescription(data.text);
            if (data.isDockMode) {
              setIsDock(true);
            }
            if (data.autoExecute) {
              executeTailoringFlow(data.text);
            }
          }
        }
      );
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }
    return undefined;
  }, []);

  const toggleDockView = (enableDock: boolean) => {
    setIsDock(enableDock);
    if (typeof window !== 'undefined' && (window as any).electron && (window as any).electron.ipcRenderer) {
      if (enableDock) {
        (window as any).electron.ipcRenderer.send('switch-to-dock-mode');
      } else {
        (window as any).electron.ipcRenderer.send('switch-to-full-app');
      }
    }
  };

  const executeTailoringFlow = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    setIsAnalyzing(true);
    setDockStep('idle');

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || "";

      const res = await fetch(GENERATE_QUESTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ job_description: textToProcess })
      });

      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();

      setActiveTailoredId(data.tailored_resume_id);
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
      setQuestions([
        { id: 1, question: "Can you elaborate on a high-concurrency architecture issue you resolved?", context_target: "Backend Systems" },
        { id: 2, question: "What specific trade-offs did you make when setting up persistent data caching?", context_target: "Database Optimization" }
      ]);
    } finally {
      setIsAnalyzing(false);
      setCurrentQuestionIndex(0);
      setAnswers({});
      if (isDock) {
        setDockStep('interview');
      } else {
        setShowVoiceModal(true);
      }
    }
  };

  const handleFinishInterview = () => {
    if (isDock) {
      setDockStep('cover_letter_prompt');
    } else {
      handleFinishTailoring(true);
    }
  };

  const handleFinishTailoring = async (generateCoverLetters: boolean = false) => {
    setIsTailoring(true);
    setShowVoiceModal(false);

    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token || "";

      const res = await fetch(TAILOR_RESUME_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tailored_resume_id: activeTailoredId,
          job_description: jobDescription,
          interview_answers: questions.map((q) => ({ question_id: q.id, answer_text: answers[q.id] || "" })),
          generate_cover_letters: generateCoverLetters
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAtsDiagnostics(data.ats_diagnostics);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTailoring(false);
      
      const newResume = { id: Date.now().toString(), name: 'Tailored Resume (Generated).pdf', size: '218 KB', date: 'Just Now', ats_score: 93 };
      setResumes((prev) => [newResume, ...prev]);

      const outputFiles = [
        { name: "Tailored_Resume_ATS.pdf", type: "pdf", url: "#" }
      ];

      if (generateCoverLetters) {
        const cover1 = { id: (Date.now() + 1).toString(), name: 'Cover Letter Formal.docx', size: '34 KB', date: 'Just Now' };
        const cover2 = { id: (Date.now() + 2).toString(), name: 'Cover Letter Conversational.docx', size: '32 KB', date: 'Just Now' };
        setCoverLetters((prev) => [cover1, cover2, ...prev]);
        
        outputFiles.push(
          { name: "Cover_Letter_Formal.docx", type: "docx", url: "#" },
          { name: "Cover_Letter_Conversational.docx", type: "docx", url: "#" }
        );
      }

      setGeneratedDockFiles(outputFiles);
      setDockStep('completed');
    }
  };

  const deleteResume = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const deleteCoverLetter = (id: string) => {
    setCoverLetters((prev) => prev.filter((l) => l.id !== id));
  };

  const filteredResumes = resumes.filter((r) => r.name.toLowerCase().includes(searchResumes.toLowerCase()));
  const filteredLetters = coverLetters.filter((l) => l.name.toLowerCase().includes(searchLetters.toLowerCase()));

  if (isDock) {
    return (
      <div className="flex flex-col h-full bg-[#0f172a]/80 backdrop-blur-xl text-slate-100 p-4 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] justify-between">
        <div 
          className="flex items-center justify-between pb-3 border-b border-white/10 cursor-move select-none" 
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs text-white">ATS Dock Mode</span>
          </div>
          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
              onClick={() => toggleDockView(false)} 
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-[11px] rounded-lg flex items-center gap-1 transition-colors border border-white/10"
              title="Exit Dock Mode"
            >
              <Maximize2 className="w-3 h-3 text-cyan-400" />
              <span>Exit Dock</span>
            </button>
          </div>
        </div>

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center my-auto gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
            <p className="text-xs text-slate-400">Extracting gaps & initializing interview...</p>
          </div>
        )}

        {!isAnalyzing && dockStep === 'interview' && questions.length > 0 && (
          <div className="flex flex-col gap-y-3 my-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-[9px] text-purple-400">{questions[currentQuestionIndex].context_target}</span>
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-100">
              {questions[currentQuestionIndex].question}
            </p>
            <textarea
              value={answers[questions[currentQuestionIndex].id] || ''}
              onChange={(e) => setAnswers({ ...answers, [questions[currentQuestionIndex].id]: e.target.value })}
              placeholder="Type or dictate response..."
              className="w-full h-24 p-2.5 bg-[#0b1120]/50 border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 resize-none"
            />
            <div className="flex justify-between items-center pt-1">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                className="text-xs text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
              >
                Back
              </button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all"
                >
                  Next <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleFinishInterview}
                  className="px-3 py-1.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.4)] transition-all"
                >
                  Continue <Check className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {dockStep === 'cover_letter_prompt' && !isTailoring && (
          <div className="flex flex-col items-center justify-center my-auto text-center gap-y-4 p-2">
            <HelpCircle className="w-8 h-8 text-purple-400" />
            <div className="flex flex-col gap-y-1">
              <h4 className="text-xs font-bold text-white">Generate Cover Letters?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Would you like to build tailored cover letter variations alongside your resume?
              </p>
            </div>
            <div className="flex gap-2 w-full pt-2">
              <button
                onClick={() => handleFinishTailoring(false)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-xl border border-white/10 transition-colors"
              >
                Resume Only
              </button>
              <button
                onClick={() => handleFinishTailoring(true)}
                className="flex-1 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-[0_0_10px_rgba(6,182,212,0.4)] transition-all"
              >
                Generate Both
              </button>
            </div>
          </div>
        )}

        {isTailoring && (
          <div className="flex flex-col items-center justify-center my-auto gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
            <p className="text-xs text-slate-400">Synthesizing ATS PDF & Cover Letters...</p>
          </div>
        )}

        {dockStep === 'completed' && (
          <div className="flex flex-col gap-y-3 my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Ready to Drag & Drop
              </span>
              <button 
                onClick={() => { setDockStep('idle'); setJobDescription(''); }} 
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Reset
              </button>
            </div>

            <div className="flex flex-col gap-y-2">
              {generatedDockFiles.map((file, idx) => (
                <div 
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("DownloadURL", `application/octet-stream:${file.name}:${file.url}`);
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {file.type === 'pdf' ? (
                      <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-slate-200 truncate">{file.name}</span>
                  </div>
                  <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-6 md:gap-y-8 pb-8 w-full max-w-7xl mx-auto min-h-screen bg-slate-50 text-slate-800 font-sans p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Tailor your resume
          </h1>
          <h2 className="text-sm font-semibold text-cyan-600 mt-1">{userName}</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Paste the job description and generate tailored documents optimized for applicant tracking systems.
          </p>
        </div>

        <button
          onClick={() => toggleDockView(true)}
          className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors border border-slate-200 shadow-sm"
        >
          <Minimize2 className="w-3.5 h-3.5 text-cyan-600" />
          Switch to Mini Dock
        </button>
      </div>

      <div className="bg-white h-[400px] border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100/40 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        
        <div className="w-full md:w-1/3 flex items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden z-10 h-full">
          <Image 
            src="/illustration_boy.jpg" 
            alt="Tailor Assistant" 
            width={220}
            height={220}
            className="object-contain rounded-xl opacity-90" 
          />
        </div>

        <div className="w-full md:w-2/3 flex flex-col gap-y-3 z-10">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">1</span>
            <label className="text-sm font-bold text-slate-900">Paste the job description</label>
          </div>

          <div className="relative">
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              maxLength={10000}
              placeholder="Paste the full job description here..."
              className="w-full h-36 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
            />
            <span className="absolute bottom-3 right-4 text-[11px] text-slate-400 font-mono">
              {jobDescription.length.toLocaleString()} / 10,000 characters
            </span>
          </div>

          <div className="relative inline-block pt-1">
            <div className="inline-flex rounded-xl shadow-sm">
              <button
                disabled={isAnalyzing || isTailoring || !jobDescription.trim()}
                onClick={() => executeTailoringFlow(jobDescription)}
                className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-bold text-xs md:text-sm rounded-l-xl flex items-center gap-2 transition-colors border-r border-cyan-600 disabled:opacity-50 disabled:shadow-none"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting STAR Gaps...
                  </>
                ) : isTailoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Building PDF...
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    Tailor Resume Now
                  </>
                )}
              </button>
              
              <button
                disabled={isAnalyzing || isTailoring || !jobDescription.trim()}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen((prev) => !prev);
                }}
                className="px-3 py-2.5 bg-cyan-500 hover:bg-cyan-600 active:bg-cyan-700 text-white font-bold text-xs rounded-r-xl flex items-center transition-colors disabled:opacity-50"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-lg z-30 py-1.5">
                <button
                  onClick={() => executeTailoringFlow(jobDescription)}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-cyan-600 flex items-center gap-2.5 transition-colors"
                >
                  <FileText className="w-4 h-4 text-cyan-500" />
                  Tailor Immediately
                </button>
                <button
                  onClick={() => toggleDockView(true)}
                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-cyan-600 flex items-center gap-2.5 transition-colors border-t border-slate-100"
                >
                  <Clock className="w-4 h-4 text-purple-500" />
                  Switch to Mini Dock View
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-50 rounded-xl text-cyan-600">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base md:text-lg">Tailored Resumes</h3>
            </div>
            <div className="relative w-40 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchResumes}
                onChange={(e) => setSearchResumes(e.target.value)}
                placeholder="Search resumes..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            <span className="font-bold text-cyan-600 text-sm mr-1">{resumes.length}</span> Resumes tailored so far
          </p>

          <div className="flex flex-col gap-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredResumes.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                <div className="flex items-center gap-3 truncate">
                  <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.size} • {item.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.ats_score && (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md border border-emerald-200">
                      {item.ats_score}% ATS
                    </span>
                  )}
                  <button onClick={() => deleteResume(item.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col gap-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base md:text-lg">Cover Letters</h3>
            </div>
            <div className="relative w-40 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchLetters}
                onChange={(e) => setSearchLetters(e.target.value)}
                placeholder="Search cover letters..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            <span className="font-bold text-purple-600 text-sm mr-1">{coverLetters.length}</span> Cover letters created
          </p>

          <div className="flex flex-col gap-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredLetters.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                <div className="flex items-center gap-3 truncate">
                  <FileCode className="w-5 h-5 text-purple-500 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                    <span className="text-[10px] text-slate-400">{item.size} • {item.date}</span>
                  </div>
                </div>
                <button onClick={() => deleteCoverLetter(item.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm">
                <Sparkles className="w-4 h-4" /> Interactive Gap Alignment
              </div>
              <button onClick={() => setShowVoiceModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {questions.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{questions[currentQuestionIndex].context_target}</span>
                </div>

                <p className="text-sm font-bold text-slate-800 leading-snug">
                  {questions[currentQuestionIndex].question}
                </p>

                <textarea
                  value={answers[questions[currentQuestionIndex].id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [questions[currentQuestionIndex].id]: e.target.value })}
                  placeholder="Type or dictate your response..."
                  className="w-full h-28 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-cyan-500 resize-none"
                />

                <div className="flex justify-between items-center pt-2">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs text-slate-500 disabled:opacity-30 font-semibold"
                  >
                    Previous
                  </button>
                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-cyan-200"
                    >
                      Next Question <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleFinishInterview}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-purple-200"
                    >
                      Complete & Tailor <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}