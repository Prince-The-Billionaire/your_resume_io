'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, Scissors, Folder, MessageSquare, X, LogOut, 
  User as UserIcon, LogIn, ChevronUp, Sparkles, ChevronLeft, ChevronRight 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (isOpen: boolean) => void;
  user: any;
  handleGoogleAuth: (promptType: 'select_account' | 'consent') => void;
  handleSignOut: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isMobileNavOpen,
  setIsMobileNavOpen,
  user,
  handleGoogleAuth,
  handleSignOut
}: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "User";
  const userAvatar = user?.user_metadata?.avatar_url;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside className={`
      fixed md:static inset-y-0 left-0 z-30 bg-white border-r border-slate-200/60 p-3 lg:p-4 flex flex-col justify-between transition-all duration-300
      ${isCollapsed ? 'w-20' : 'w-64'}
      ${isMobileNavOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'}
    `}>
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3 mx-auto lg:mx-0">
            <Image src="/logo.jpg" alt="Logo" width={36} height={36} className="rounded-xl object-cover shadow-sm shrink-0" />
            {!isCollapsed && (
              <span className="font-serif font-bold text-lg text-slate-900 tracking-tight hidden lg:inline">Your Resume</span>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className="hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsMobileNavOpen(false)} className="md:hidden p-1.5 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1.5">
          {[
            { name: 'Dashboard', icon: LayoutDashboard },
            { name: 'Tailor', icon: Scissors },
            { name: 'Projects', icon: Folder },
            { name: 'Interview', icon: MessageSquare }
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name);
                setIsMobileNavOpen(false);
              }}
              title={item.name}
              className={`w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === item.name 
                  ? 'bg-violet-50 text-violet-700 shadow-xs border border-violet-100/50' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeTab === item.name ? 'text-violet-600' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="hidden lg:inline truncate">{item.name}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-y-4 mt-auto pt-4 border-t border-slate-100">
        {!isCollapsed && (
          <div className="hidden lg:block p-3.5 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl text-white shadow-md space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-200">Pro Plan</span>
            </div>
            <p className="text-[11px] text-violet-100 leading-relaxed">
              Unlock unlimited AI tailoring, Modal batch jobs, and direct exports.
            </p>
          </div>
        )}

        {user ? (
          <div className="relative">
            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-40 animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center justify-center lg:justify-start gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span className="hidden lg:inline">Log Out</span>}
                </button>
              </div>
            )}

            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full p-2 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between hover:bg-slate-100/80 transition-colors group"
            >
              <div className="flex items-center gap-2.5 overflow-hidden mx-auto lg:mx-0">
                {userAvatar ? (
                  <Image src={userAvatar} alt="Profile" width={32} height={32} className="rounded-full object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                {!isCollapsed && (
                  <div className="flex flex-col text-left truncate hidden lg:flex">
                    <span className="text-xs font-semibold text-slate-800 truncate">{userName}</span>
                    <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 hidden lg:block ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button 
              onClick={() => handleGoogleAuth('select_account')} 
              className="w-full py-2 bg-slate-900 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xs"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="hidden lg:inline">Log In</span>}
            </button>
            <button 
              onClick={() => handleGoogleAuth('consent')} 
              className="w-full py-2 bg-slate-100 text-slate-700 font-medium text-xs rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {!isCollapsed && <span className="hidden lg:inline">Sign Up / Switch</span>}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}