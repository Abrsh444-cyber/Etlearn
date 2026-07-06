import React from 'react';
import { motion } from 'motion/react';
import { 
  Bot, Award, Calendar, BookOpen, Clock, Play, GraduationCap, ChevronRight, HelpCircle, FileText, Sparkles
} from 'lucide-react';
import { StudentProfile } from '../types';
import { playClickChime } from '../utils/audio';

interface HomeDashboardProps {
  profile: StudentProfile;
  language: 'en' | 'am';
  onNavigate: (page: 'home' | 'tutor' | 'quiz' | 'profile' | 'notes' | 'examprep') => void;
  onUpdateGrade: (grade: string) => void;
  streakCount: number;
  studyHoursCount: number;
}

export default function HomeDashboard({
  profile,
  language,
  onNavigate,
  onUpdateGrade,
  streakCount,
  studyHoursCount
}: HomeDashboardProps) {

  // Load last session info
  const lastActiveSubject = localStorage.getItem('ethiolearn_last_subject') || profile.subjects[0] || "Emerging Technologies";
  const lastScore = localStorage.getItem('ethiolearn_last_quiz_score');

  const grades = [
    { value: 'Grade 12', label: language === 'en' ? 'Grade 12' : 'ክፍል 12' },
    { value: 'University', label: language === 'en' ? 'University' : 'ዩኒቨርሲቲ' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Greeting Card with Habesha Netela style trim */}
      <div 
        id="dashboard-header-card"
        className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-800 shadow-sm p-6"
      >
        {/* National Pattern Trim of Green, Gold, Red */}
        <div className="absolute top-0 inset-x-0 h-1.5 flex select-none">
          <div className="flex-1 bg-emerald-600 h-full" />
          <div className="flex-1 bg-[#FCDD09] h-full" />
          <div className="flex-1 bg-red-600 h-full" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">
              {language === 'en' ? `Hello, ${profile.name}!` : `ሰላም፥ ${profile.name}! 👋`}
            </h1>
            <p className="text-sm md:text-base text-slate-500 dark:text-zinc-400 mt-1 font-sans">
              {language === 'en' 
                ? "Welcome back to your personalized study portal. Let's achieve excellence today!"
                : "ወደ እርስዎ የጥናት መድረክ እንኳን በደህና መጡ። ዛሬም ጎበዝ እንሁን!"}
            </p>
            
            {/* FRONT WELCOME BOARD NOTE BUTTON - Requirement */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                id="front-welcome-note-btn"
                onClick={() => { playClickChime(); onNavigate('notes'); }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#078930] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
              >
                <span>📔</span>
                <span>{language === 'en' ? 'Quick Notes Study board' : 'የማስታወሻ ደብተር'}</span>
              </button>
            </div>
          </div>

          {/* Quick study metrics pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-lg">🔥</span>
              <div>
                <span className="block text-xs text-emerald-850 dark:text-emerald-400 font-bold leading-none">Streak / ቀኖች</span>
                <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{streakCount} Days</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/60">
              <span className="text-lg">⏱️</span>
              <div>
                <span className="block text-xs text-amber-850 dark:text-amber-405 font-bold leading-none">Studied / ጥናት</span>
                <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono">{studyHoursCount} Hrs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Three Big Action Shortcut Buttons - minimum 48px high, full width on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          id="btn-shortcut-gpt"
          onClick={() => { playClickChime(); onNavigate('tutor'); }}
          className="w-full h-16 min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-serif font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Bot className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-sm font-bold">{language === 'en' ? 'Chat with AI Tutor' : 'ከአይ መምህር ጋር አውራ'}</span>
              <span className="block text-[10px] text-emerald-100 font-sans font-normal opacity-85">
                {language === 'en' ? 'Get immediate study answers' : 'ለጥያቄዎችዎ ቅጽበታዊ መልስ'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          id="btn-shortcut-examprep"
          onClick={() => { playClickChime(); onNavigate('examprep'); }}
          className="w-full h-16 min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-[#078930] hover:from-indigo-700 hover:to-emerald-750 text-white font-serif font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5.5 h-5.5 text-amber-300" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-sm font-bold">{language === 'en' ? 'Exam Prep Notes Hub' : 'የፈተና ማጠቃለያ ማዕከል'}</span>
              <span className="block text-[10px] text-emerald-50 font-sans font-normal opacity-85">
                {language === 'en' ? 'Interactive guides & test prep' : 'ቅድመ-ፈተና ማጠቃለያ ማስታወሻዎች'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          id="btn-shortcut-quiz"
          onClick={() => { playClickChime(); onNavigate('quiz'); }}
          className="w-full h-16 min-h-[48px] px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-[#C8962E] hover:from-amber-600 hover:to-[#B28224] text-black font-serif font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-between group cursor-pointer active:scale-98"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black shrink-0">
              <Award className="w-5.5 h-5.5" />
            </div>
            <div className="text-left leading-tight">
              <span className="block text-sm font-bold">{language === 'en' ? 'Take a Practice Quiz' : 'የመማሪያ ፈተና ውሰድ'}</span>
              <span className="block text-[10px] text-amber-950/85 font-sans font-normal opacity-85">
                {language === 'en' ? 'Test knowledge on key topics' : 'እውቀትዎን በፈተናዎች ይለኩ'}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-950 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 sections) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Where You Left Off Card */}
          <div className="rounded-2xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-800 shadow-sm p-6 relative">
            <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
              <span className="text-lg">📖</span>
              {language === 'en' ? 'Continue where you left off' : 'ካቆሙበት ይቀጥሉ'}
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-add sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold font-serif shrink-0 text-lg">
                  {lastActiveSubject.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="block text-xs text-[#078930] dark:text-emerald-400 font-bold uppercase tracking-wider">
                    {language === 'en' ? 'Last Active Subject' : 'መጨረሻ ላይ የተከፈተ ትምህርት'}
                  </span>
                  <span className="block text-base font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{lastActiveSubject}</span>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => { playClickChime(); onNavigate('notes'); }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Study' : 'አጥና'}
                </button>
                <button
                  onClick={() => { playClickChime(); onNavigate('quiz'); }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-250 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {language === 'en' ? 'Quiz' : 'ፈተን'}
                </button>
              </div>
            </div>

            {lastScore && (
              <div className="mt-3 text-xs text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1">
                <span>🎯</span>
                <span>
                  {language === 'en' 
                    ? `Last quiz attempt score in session was: ${lastScore}%` 
                    : `በመጨረሻው ፈተና ያስመዘገቡት ውጤት፡ ${lastScore}%`}
                </span>
              </div>
            )}
          </div>

          {/* Quick grade selector (Grade 12 / University) */}
          <div className="rounded-2xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-800 shadow-sm p-6">
            <h3 className="text-lg font-bold font-serif text-slate-800 dark:text-zinc-100 mb-2 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              {language === 'en' ? 'Select Academic Level' : 'የትምህርት ደረጃ መምረጫ'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mb-4 font-sans uppercase tracking-wider">
              {language === 'en' 
                ? 'Instantly change your course standard curriculum' 
                : 'የስርዓተ-ትምህርት ማስተካከያ ደረጃን በፍጥነት ይምረጡ'}
            </p>

            <div className="grid grid-cols-2 gap-3.5 max-w-md">
              {grades.map((g) => {
                const isActive = profile.year === g.value;
                return (
                  <button
                    key={g.value}
                    onClick={() => { playClickChime(); onUpdateGrade(g.value); }}
                    className={`h-12 min-h-[44px] px-3 py-2 rounded-xl text-xs font-serif font-extrabold tracking-tight uppercase border-2 text-center transition-all cursor-pointer ${
                      isActive 
                        ? 'border-[#078930] bg-[#078930]/10 text-emerald-850 dark:text-emerald-400 shadow-sm scale-102' 
                        : 'border-slate-200 dark:border-zinc-800 hover:border-emerald-500 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Habesha study tip card + shortcuts) */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#078930]/5 dark:bg-[#078930]/10 border border-[#078930]/15 dark:border-[#078930]/30 shadow-sm p-6 relative">
            <div className="absolute top-3 right-4 text-2xl animate-spin" style={{ animationDuration: '40s' }}>☀️</div>
            
            <span className="inline-block px-2.5 py-1 rounded bg-[#078930] text-white font-serif text-[10px] uppercase tracking-widest font-extrabold mb-3">
              Daily Wisdom
            </span>

            <h4 className="text-base font-bold font-serif text-slate-800 dark:text-zinc-100 mb-2">
              {language === 'en' ? 'Ethiopian Academic Tip' : 'የአጠናን ብልሃት'}
            </h4>
            <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed font-serif italic">
              {language === 'en' 
                ? '"Enkutatash signals new organic growth. Let your mental focus expand step-by-step; the AI Tutor is here to break down complex tasks into easily digestible, rewarding micro-goals."' 
                : '"ትልቅ እውቀት የሚገኘው በትናንሽ ግቦች ጥረት ነው። አእምሮዎን በየቀኑ ያሳድጉ፤ አስቸጋሪ ነገሮች ሲገጥሙ እያንዳንዱን ጥያቄ ለአይ የመማሪያ ረዳቱ በማቅረብ ይገንዘቡ።"'}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-zinc-800/80 flex justify-between items-center text-xs font-mono text-emerald-805 dark:text-emerald-400">
              <span>📚 {profile.subjects.length} Subjects Active</span>
              <span>⚡ Goal: {profile.dailyGoalHours}h a Day</span>
            </div>
          </div>

          {/* Quick study notes view shortcut */}
          <div className="rounded-2xl bg-white dark:bg-[#0c0d12] border border-slate-200 dark:border-zinc-800 shadow-sm p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-[#C8962E]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-105 leading-tight">
                  {language === 'en' ? 'Study Bookmarks' : 'የጥናት ማስታወሻዎች'}
                </h4>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  {language === 'en' ? 'Review saved study decks' : 'የተዘጋጁ ማስታወሻዎችን ከልስ'}
                </p>
              </div>
            </div>

            <button 
              onClick={() => { playClickChime(); onNavigate('notes'); }}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer font-sans"
            >
              {language === 'en' ? 'Open' : 'ክፈት'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
