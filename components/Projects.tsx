'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  ExternalLink, 
  MoreHorizontal, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Search, 
  Bell, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function Projects({ user }: { user?: any }) {
  const [githubUrl, setGithubUrl] = useState('https://github.com/princewilldev');
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  return (
    <div className="flex flex-col gap-y-8 w-full max-w-[1400px] mx-auto min-h-full bg-[#F8F9FD] text-slate-800 font-sans">
      
      <div className="flex items-center justify-end gap-4 w-full">
        <div className="relative hidden md:flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3" />
          <input 
            type="text" 
            placeholder="Search" 
            className="pl-9 pr-12 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 w-64"
          />
          <div className="absolute right-2 flex items-center">
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Ctrl K</span>
          </div>
        </div>
        <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Showcase your work from multiple platforms.</p>
        </div>
        <button className="px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-medium text-sm rounded-xl flex items-center gap-2 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Add Project Source
        </button>
      </div>

      <div className="relative flex items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          
          <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col gap-y-4">
            <div className="w-full h-48 rounded-2xl relative overflow-hidden bg-slate-100">
               <Image 
                 src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800" 
                 alt="AI Resume Builder" 
                 fill
                 className="object-cover"
               />
               <div className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-md z-10">
                 <Image src="https://cdn.simpleicons.org/github/181717" alt="GitHub" width={20} height={20} />
               </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">AI Resume Builder</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">A smart resume builder that uses AI to tailor resumes for any job role.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">React</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">TypeScript</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">AI</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
              <button className="text-violet-600 font-semibold text-sm flex items-center gap-1.5 hover:text-violet-700">
                View Project <ExternalLink className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col gap-y-4">
            <div className="w-full h-48 rounded-2xl relative overflow-hidden bg-slate-100">
               <Image 
                 src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800" 
                 alt="Dashboard UI Design" 
                 fill
                 className="object-cover"
               />
               <div className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-md z-10">
                 <Image src="https://cdn.simpleicons.org/behance/1769FF" alt="Behance" width={20} height={20} />
               </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Dashboard UI Design</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">Clean and modern dashboard concept for productivity apps.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">UI/UX</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">Figma</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">Design</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
              <button className="text-violet-600 font-semibold text-sm flex items-center gap-1.5 hover:text-violet-700">
                View Project <ExternalLink className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm flex flex-col gap-y-4">
            <div className="w-full h-48 rounded-2xl relative overflow-hidden bg-slate-100">
               <Image 
                 src="https://images.unsplash.com/photo-1616077168079-7e09a6a3b04b?auto=format&fit=crop&q=80&w=800" 
                 alt="Fintech Mobile App" 
                 fill
                 className="object-cover"
               />
               <div className="absolute top-3 right-3 bg-white p-1.5 rounded-full shadow-md z-10">
                 <Image src="https://cdn.simpleicons.org/dribbble/EA4C89" alt="Dribbble" width={20} height={20} />
               </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Fintech Mobile App</h3>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">Mobile banking app concept focused on simplicity and clarity.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">Mobile</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">UI/UX</span>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full">Fintech</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
              <button className="text-violet-600 font-semibold text-sm flex items-center gap-1.5 hover:text-violet-700">
                View Project <ExternalLink className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center cursor-pointer hover:bg-slate-50 hidden xl:flex">
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 -mt-4">
        <div className="w-2.5 h-2.5 rounded-full bg-violet-600"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white p-6 border border-slate-200 rounded-3xl shadow-sm">
        <div className="lg:col-span-4 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Add Project Source</h3>
            <p className="text-xs text-slate-500 mt-1">Connect platforms to automatically import your projects.</p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3 mt-2">
            <button className="flex flex-col items-center justify-center gap-2 p-3 border-2 border-slate-200 rounded-2xl hover:border-violet-500 transition-colors bg-white">
              <Image src="https://cdn.simpleicons.org/github/181717" alt="GitHub" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">GitHub</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="https://cdn.simpleicons.org/behance/1769FF" alt="Behance" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">Behance</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="https://cdn.simpleicons.org/dribbble/EA4C89" alt="Dribbble" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">Dribbble</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="/linkedin-32px.png" alt="LinkedIn" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">LinkedIn</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="https://cdn.simpleicons.org/devdotto/000000" alt="Dev.to" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">Dev.to</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="https://cdn.simpleicons.org/medium/000000" alt="Medium" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">Medium</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="https://cdn.simpleicons.org/hashnode/2962FF" alt="Hashnode" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">Hashnode</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="/codepen-32px.png" alt="CodePen" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">CodePen</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm">
              <Image src="https://cdn.simpleicons.org/vercel/000000" alt="Vercel" width={28} height={28} />
              <span className="text-[10px] font-semibold text-slate-700">Vercel</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl hover:border-violet-500 transition-colors shadow-sm sm:col-start-2 lg:col-start-2">
              <MoreHorizontal className="w-7 h-7 text-slate-400" />
              <span className="text-[10px] font-semibold text-slate-700">More</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6 lg:pl-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="https://cdn.simpleicons.org/github/181717" alt="GitHub" width={24} height={24} />
              <span className="font-bold text-slate-900 text-base">GitHub</span>
            </div>
            <span className="px-2.5 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full border border-green-200">Connected</span>
          </div>

          <p className="text-[13px] text-slate-600 mt-2">Paste your GitHub profile or repository URL</p>
          
          <input 
            type="text" 
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-violet-500"
          />

          <button 
            onClick={handleScan}
            disabled={isScanning}
            className="w-full py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 mt-1"
          >
            {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Scan Projects
          </button>

          <div className="flex flex-col gap-y-3 mt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Connecting to GitHub...</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Fetching repositories...</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500 font-medium">Analyzing projects...</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-600 font-bold">Projects loaded successfully!</span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-slate-100 rounded-full mt-auto overflow-hidden">
            <div className="h-full bg-violet-600 w-full rounded-full"></div>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col h-full lg:pl-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Projects Found (6)</h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1">
            {[
              { title: 'ai-resume-builder', desc: 'AI-powered resume builder with role tailoring' },
              { title: 'portfolio-website', desc: 'Personal portfolio built with Next.js and Tailwind' },
              { title: 'job-tracker-app', desc: 'Track job applications and interview progress' },
              { title: 'dashboard-ui', desc: 'Reusable dashboard UI components library' },
            ].map((proj, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/70 transition-colors">
                <div className="flex items-start gap-3">
                  <Image src="https://cdn.simpleicons.org/github/181717" alt="GitHub" width={20} height={20} className="shrink-0 mt-0.5 opacity-80" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{proj.title}</span>
                    <span className="text-[11px] text-slate-500">{proj.desc}</span>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 text-violet-600 text-xs font-bold hover:text-violet-700">
                  View <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <button className="text-violet-600 text-xs font-bold flex items-center gap-1.5 mt-4 hover:text-violet-700 self-start">
            View All Projects (6) <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}