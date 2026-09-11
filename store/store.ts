import { create } from 'zustand';

interface AppState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  // Tailor State
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  tailoredResumes: any[];
  coverLetters: any[];
  isLoading: boolean;
  loadingText: string;
  isFloatingWidgetOpen: boolean;
  setFloatingWidgetOpen: (isOpen: boolean) => void;

  // Actions
  handleTailorAction: (type: 'resume' | 'both', masterResume: any) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: 'Dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  jobDescription: '',
  setJobDescription: (jd) => set({ jobDescription: jd }),
  tailoredResumes: [],
  coverLetters: [],
  isLoading: false,
  loadingText: '',
  isFloatingWidgetOpen: false,
  setFloatingWidgetOpen: (isOpen) => set({ isFloatingWidgetOpen: isOpen }),

  handleTailorAction: async (type, masterResume) => {
    const { jobDescription } = get();
    if (!masterResume || !jobDescription) return;
    
    set({ isLoading: true, loadingText: 'Tailoring resume to job description...' });
    
    try {
      const resumeRes = await fetch("YOUR_MODAL_URL/tailor_resume_endpoint", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDescription, master_resume: masterResume })
      }).then(res => res.json());
      
      set((state) => ({ tailoredResumes: [resumeRes.tailored_resume, ...state.tailoredResumes] }));

      if (type === 'both') {
        set({ loadingText: 'Drafting cover letter...' });
        const clRes = await fetch("YOUR_MODAL_URL/generate_cover_letter_endpoint", {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jobDescription, master_resume: resumeRes.tailored_resume })
        }).then(res => res.json());
        
        set((state) => ({ coverLetters: [clRes.cover_letter, ...state.coverLetters] }));
      }
    } catch (err) {
      console.error("Tailoring failed:", err);
    } finally {
      set({ isLoading: false });
    }
  }
}));