/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home as HomeIcon, Bot, Trophy, Award, Sparkles, Calendar, Sun, Moon, User as UserIcon, BookOpen, CheckCircle
} from 'lucide-react';

import { StudentProfile, CustomNote, Flashcard } from './types';
import SplashOnboarding from './components/SplashOnboarding';
import PWADownloadAssistant from './components/PWADownloadAssistant';
import AITutor from './components/AITutor';
import ExamPrep from './components/ExamPrep';
import StudyNotesView from './components/StudyNotesView';
import HomeDashboard from './components/HomeDashboard';
import StudentProfileView from './components/StudentProfileView';
import BookStoreView from './components/BookStoreView';
import UniversityExamsView from './components/UniversityExamsView';
import UpgradeProView from './components/UpgradeProView';
import EthioLearnLogo from './components/EthioLearnLogo';
import SupportChatBubble from './components/SupportChatBubble';
import ExamNotesHubView from './components/ExamNotesHubView';
import InAppViewerModal from './components/InAppViewerModal';

import { 
  testFirestoreConnection, 
  syncProfileToFirestore, 
  fetchProfileFromFirestore, 
  saveNoteToFirestore, 
  deleteNoteFromFirestore, 
  fetchNotesFromFirestore 
} from './utils/firebaseStore';

import { getEthiopianDate } from './utils/ethiopianCalendar';
import { playClickChime, playSuccessChime, playFailureChime } from './utils/audio';
import { initAuth, googleSignIn, googleSignInRedirect, logoutGoogle, exportAnalyticsToGoogleSheets } from './utils/workspace';
import { User as FirebaseUser } from 'firebase/auth';
import { supabase } from './utils/supabase';
import { initSupabaseConfig, getSupabase } from './utils/supabaseClient';

// Helper functions for real study streak calculation based on actual calendar days
function recordStudyActivity() {
  const datesStr = localStorage.getItem('ethiolearn_study_dates');
  let dates: string[] = [];
  if (datesStr) {
    try {
      dates = JSON.parse(datesStr);
    } catch (e) {
      dates = [];
    }
  }
  
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayKey = `${year}-${month}-${day}`;
  
  if (!dates.includes(todayKey)) {
    dates.push(todayKey);
    localStorage.setItem('ethiolearn_study_dates', JSON.stringify(dates));
  }
}

function getCurrentStreak(): number {
  const datesStr = localStorage.getItem('ethiolearn_study_dates');
  if (!datesStr) return 0;
  let dates: string[] = [];
  try {
    dates = JSON.parse(datesStr);
  } catch (e) {
    return 0;
  }
  
  if (!Array.isArray(dates) || dates.length === 0) return 0;
  
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  
  const getOffsetDateString = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };
  
  const todayKey = getOffsetDateString(0);
  const yesterdayKey = getOffsetDateString(1);
  
  if (!uniqueDates.includes(todayKey) && !uniqueDates.includes(yesterdayKey)) {
    return 0;
  }
  
  let currentStreak = 0;
  let checkOffset = 0;
  
  if (!uniqueDates.includes(todayKey) && uniqueDates.includes(yesterdayKey)) {
    checkOffset = 1;
  }
  
  while (true) {
    const key = getOffsetDateString(checkOffset);
    if (uniqueDates.includes(key)) {
      currentStreak++;
      checkOffset++;
    } else {
      break;
    }
  }
  
  return currentStreak;
}

export default function App() {
  // Load profile with default 'light' theme preference
  const [profile, setProfile] = useState<StudentProfile | null>(() => {
    const saved = localStorage.getItem('ethiolearn_current_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.subjects)) {
          const all22 = [
            "Emerging Technologies",
            "Introduction to Economics",
            "General Biology",
            "Communicative English",
            "Moral and Civic Education",
            "Mathematics",
            "Inclusive Education",
            "Geography",
            "Logic and Critical Thinking",
            "History",
            "Chemistry",
            "Aptitude",
            "General Physics",
            "Entrepreneurship",
            "Social Anthropology",
            "C++ Programming",
            "Civics",
            "Agriculture",
            "Business",
            "Moral and Civics",
            "Emerging Tech",
            "Applied Math"
          ];
          let updated = false;
          all22.forEach(s => {
            if (!parsed.subjects.includes(s)) {
              parsed.subjects.push(s);
              updated = true;
            }
          });
          if (updated) {
            localStorage.setItem('ethiolearn_current_profile', JSON.stringify(parsed));
          }
        }
        return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Persistent language preference
  const [language, setLanguage] = useState<'en' | 'am'>(() => {
    const saved = localStorage.getItem('ethiolearn_language_preference');
    return (saved === 'am' || saved === 'en') ? saved : 'en';
  });

  const [currentPage, setCurrentPage] = useState<'home' | 'tutor' | 'quiz' | 'profile' | 'notes' | 'bookstore' | 'university' | 'upgrade' | 'examprep'>('home');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('ethiolearn_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light';
  });

  // Load custom notes and flashcards
  const [customNotes, setCustomNotes] = useState<CustomNote[]>(() => {
    const saved = localStorage.getItem('ethiolearn_custom_notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [decksState, setDecksState] = useState<{ [deckId: string]: Flashcard[] }>(() => {
    const saved = localStorage.getItem('ethiolearn_flashcards_decks');
    return saved ? JSON.parse(saved) : {};
  });

  // Streaks and study hours tracker
  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('ethiolearn_pro_streak');
    return saved ? parseInt(saved, 10) : 5;
  });

  const [studyHours, setStudyHours] = useState(() => {
    const saved = localStorage.getItem('ethiolearn_pro_study_hours');
    return saved ? parseFloat(saved) : 14.5;
  });

  // Google Authentication variables
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const [isPopupBlockedApp, setIsPopupBlockedApp] = useState(false);

  // Toast systems
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supabase books sync state
  const [supabaseBooks, setSupabaseBooks] = useState<any[]>([]);

  // Ethiopian Calendar support
  const [ethDate, setEthDate] = useState({ day: 1, monthName: "መስከረም", year: 2016, formatted: "መስከረም 1, 2016" });

  // PWA elements
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // In-App Viewer States
  const [inAppViewerUrl, setInAppViewerUrl] = useState<string | null>(null);
  const [inAppViewerTitle, setInAppViewerTitle] = useState<string>('');

  // Trigger toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Centralized Supabase Cloud sync function
  const syncWithSupabase = async (customProfile?: StudentProfile) => {
    const activeProfile = customProfile || profile;
    if (!activeProfile || !activeProfile.email) return;

    try {
      const supa = getSupabase();
      if (!supa) return;

      const email = activeProfile.email.toLowerCase();

      // Retrieve from local storage to get up-to-date values
      const studySessionsRaw = localStorage.getItem('ethiolearn_study_sessions');
      const studySessions = studySessionsRaw ? JSON.parse(studySessionsRaw) : [];

      const notesRaw = localStorage.getItem('ethiolearn_custom_notes');
      const notesData = notesRaw ? JSON.parse(notesRaw) : [];

      const quizRaw = localStorage.getItem('ethiolearn_quiz_perf');
      const performanceData = quizRaw ? JSON.parse(quizRaw) : {};

      // Try to select existing profile to get saved password if there is one
      const { data: existing } = await supa
        .from('student_profiles')
        .select('profile_data')
        .eq('email', email)
        .maybeSingle();

      let password = '';
      if (existing && existing.profile_data) {
        password = existing.profile_data.password || '';
      }

      const payloadRecord = {
        email,
        profile_data: {
          ...activeProfile,
          password
        },
        study_sessions: studySessions,
        notes_data: notesData,
        performance_data: performanceData,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supa
        .from('student_profiles')
        .upsert(payloadRecord, { onConflict: 'email' });

      if (upsertError) {
        console.warn('[Supabase Sync] Upsert error:', upsertError.message);
      } else {
        console.log('[Supabase Sync] Campus progress synced to Supabase successfully.');
      }
    } catch (err) {
      console.warn('[Supabase Sync] Failure during background sync:', err);
    }
  };

  // Sync automatically on page changes to ensure all local updates are persisted in Supabase
  useEffect(() => {
    syncWithSupabase();
  }, [currentPage]);

  // Sync theme setup (allows toggling both light and dark modes)
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ethiolearn_theme', themeMode);
  }, [themeMode]);

  // Sync language with localStorage preference
  useEffect(() => {
    localStorage.setItem('ethiolearn_language_preference', language);
  }, [language]);

  // Calendar calculator
  useEffect(() => {
    try {
      const computed = getEthiopianDate(new Date());
      setEthDate(computed as any);
    } catch (e) {
      console.warn("Failed standard Ethiopian calendar compute:", e);
    }
  }, []);

  // Sync and initialize real active study streak
  useEffect(() => {
    const savedDates = localStorage.getItem('ethiolearn_study_dates');
    if (!savedDates) {
      // Seed 5 consecutive days back so student doesn't drop to 0 on their very first run
      const preseeded: string[] = [];
      for (let i = 0; i < 5; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        preseeded.push(`${y}-${m}-${dayStr}`);
      }
      localStorage.setItem('ethiolearn_study_dates', JSON.stringify(preseeded));
    }
    
    // Log today's study activity on app launch
    recordStudyActivity();
    
    const realStreak = getCurrentStreak();
    setStreak(realStreak);
    localStorage.setItem('ethiolearn_pro_streak', String(realStreak));
  }, []);

  // Synchronize master API Key to the cloud container if available in active profile
  useEffect(() => {
    if (profile?.claudeApiKey) {
      fetch('/api/sync-master-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: profile.claudeApiKey })
      }).then(res => {
        if (res.ok) {
          console.log('[EthioLearn Client] Synced master API key to the active server successfully.');
        }
      }).catch(err => {
        console.warn('[EthioLearn Client] Failed to register master key with backend:', err);
      });
    }
  }, [profile?.claudeApiKey]);

  // Firebase auth sync
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Firestore connection liveness test
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Bidirectional Firestore cloud sync
  useEffect(() => {
    if (googleUser) {
      const syncCloudState = async () => {
        try {
          console.log('[Firestore Sync] Initiating bidirection cloud desk sync for UID:', googleUser.uid);
          
          // 1. Sync student profile
          const cloudProfile = await fetchProfileFromFirestore(googleUser.uid);
          if (cloudProfile) {
            console.log('[Firestore Sync] Cloud profile pulled. Applying to local study desk.');
            setProfile(cloudProfile);
            localStorage.setItem('ethiolearn_current_profile', JSON.stringify(cloudProfile));
          } else if (profile) {
            console.log('[Firestore Sync] Creating cloud profile backup.');
            await syncProfileToFirestore(googleUser.uid, profile);
          }

          // 2. Sync custom notes
          const cloudNotes = await fetchNotesFromFirestore(googleUser.uid);
          if (cloudNotes && cloudNotes.length > 0) {
            console.log('[Firestore Sync] Cloud notes pulled. Updating local portfolio.');
            setCustomNotes(cloudNotes);
            localStorage.setItem('ethiolearn_custom_notes', JSON.stringify(cloudNotes));
          } else if (customNotes.length > 0) {
            console.log('[Firestore Sync] Archiving existing local notes onto cloud database.');
            for (const note of customNotes) {
              await saveNoteToFirestore(googleUser.uid, note);
            }
          }
        } catch (err) {
          console.error('[Firestore Sync Failure]:', err);
        }
      };

      syncCloudState();
    }
  }, [googleUser]);

  // Load server-side configured Supabase secrets automatically at startup
  useEffect(() => {
    initSupabaseConfig();
  }, []);

  // PWA standard installer hook
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch curriculum books list from 'books' table in Supabase
  useEffect(() => {
    async function fetchBooks() {
      if (!supabase) {
        console.log('New Supabase client is not initialized (missing environment keys).');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('books')
          .select('*')
          .order('title', { ascending: true });

        if (error) {
          console.warn('Error fetching books list from "books" table in App.tsx:', error);
        } else if (data) {
          setSupabaseBooks(data);
          console.log('Successfully fetched curriculum books list from Supabase in App.tsx:', data);
        }
      } catch (err) {
        console.error('Failed to coordinate Supabase request in App.tsx:', err);
      }
    }
    fetchBooks();
  }, []);

  const triggerPWAInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleOnboardingComplete = (completedProfile: StudentProfile) => {
    // Override theme to default to current selected style
    const updated = { ...completedProfile, theme: themeMode };
    setProfile(updated);
    localStorage.setItem('ethiolearn_current_profile', JSON.stringify(updated));
    playSuccessChime();
    showToast(`Welcome ${completedProfile.name}!`);
  };

  const handleProfileReset = () => {
    playClickChime();
    if (window.confirm("Would you like to reset your profile and re-register?")) {
      localStorage.removeItem('ethiolearn_current_profile');
      setProfile(null);
    }
  };

  const handleSyncStatsToSheets = async () => {
    if (!googleToken || !googleUser || !profile) {
      showToast("Please sign in with Google first in the profile section!");
      playFailureChime();
      return;
    }

    try {
      setIsExportingSheets(true);
      playClickChime();
      const res = await exportAnalyticsToGoogleSheets(
        profile.name,
        profile.university,
        profile.year,
        streak,
        studyHours,
        profile.dailyGoalHours || 2,
        googleToken
      );
      playSuccessChime();
      showToast("Synced to Google Sheets!");
      window.open(res.url, '_blank');
    } catch (err: any) {
      console.error(err);
      playFailureChime();
      showToast(`Sync failed: ${err.message || err}`);
    } finally {
      setIsExportingSheets(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsPopupBlockedApp(false);
      playClickChime();
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        playSuccessChime();
        showToast(`Signed in securely with ${res.user.email}!`);
      }
    } catch (err: any) {
      console.error(err);
      playFailureChime();
      if (err?.isPopupBlocked || err?.code === 'auth/popup-blocked' || err?.message?.includes('popup')) {
        setIsPopupBlockedApp(true);
      } else {
        showToast("Google connection canceled or failed.");
      }
    }
  };

  const handleGoogleSignInRedirect = async () => {
    try {
      setIsPopupBlockedApp(false);
      playClickChime();
      await googleSignInRedirect();
    } catch (err: any) {
      console.error(err);
      playFailureChime();
      showToast("Google Redirect Sign-In failed.");
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      playClickChime();
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      playSuccessChime();
      showToast("Signed out from Google Workspace.");
    } catch (err) {
      console.error(err);
      playFailureChime();
    }
  };

  const handleSaveCustomNotes = (newNotes: CustomNote[]) => {
    setCustomNotes(newNotes);
    localStorage.setItem('ethiolearn_custom_notes', JSON.stringify(newNotes));
    syncWithSupabase();

    // Sync individual notes to Firestore if Google User is authenticated
    if (googleUser) {
      newNotes.forEach(async (note) => {
        try {
          await saveNoteToFirestore(googleUser.uid, note);
        } catch (e) {
          console.error('[Firestore Note Sync Failure]:', e);
        }
      });

      // Prune/delete any deleted note from the cloud
      fetchNotesFromFirestore(googleUser.uid).then((cloudNotes) => {
        const localIds = new Set(newNotes.map(n => n.id));
        cloudNotes.forEach(async (cn) => {
          if (!localIds.has(cn.id)) {
            try {
              await deleteNoteFromFirestore(googleUser.uid, cn.id);
            } catch (e) {
              console.error('[Firestore Note Delete Failure]:', e);
            }
          }
        });
      }).catch(err => console.error('[Firestore Prune Query Failure]:', err));
    }
  };

  const handleSaveDecksState = (deckId: string, cards: Flashcard[]) => {
    const updated = { ...decksState, [deckId]: cards };
    setDecksState(updated);
    localStorage.setItem('ethiolearn_flashcards_decks', JSON.stringify(updated));
    syncWithSupabase();
  };

  // Update profile from inside subviews
  const handleUpdateProfile = (updated: StudentProfile) => {
    setProfile(updated);
    localStorage.setItem('ethiolearn_current_profile', JSON.stringify(updated));
    syncWithSupabase(updated);

    if (googleUser) {
      syncProfileToFirestore(googleUser.uid, updated).catch(err => 
        console.error('[Firestore Profile Sync Failure]:', err)
      );
    }
  };

  // Quick grade modifier from HomeDashboard
  const handleUpdateGrade = (grade: string) => {
    if (profile) {
      const updated = { ...profile, year: grade };
      setProfile(updated);
      localStorage.setItem('ethiolearn_current_profile', JSON.stringify(updated));
      showToast(language === 'en' ? `Curriculum set to ${grade}!` : `ደረጃው ወደ ${grade} ተቀይሯል!`);
      syncWithSupabase(updated);

      if (googleUser) {
        syncProfileToFirestore(googleUser.uid, updated).catch(err => 
          console.error('[Firestore Grade Sync Failure]:', err)
        );
      }
    }
  };

  const handleRecordStudyAction = () => {
    recordStudyActivity();
    const sc = getCurrentStreak();
    setStreak(sc);
    localStorage.setItem('ethiolearn_pro_streak', String(sc));
    
    const updatedHours = Number((studyHours + 0.1).toFixed(2));
    setStudyHours(updatedHours);
    localStorage.setItem('ethiolearn_pro_study_hours', String(updatedHours));
    
    syncWithSupabase();
  };

  if (!profile) {
    return (
      <SplashOnboarding 
        onComplete={handleOnboardingComplete} 
        initialProfile={null} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050508] text-slate-800 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* HEADER BAR FOR TITLE AND ETHIOPIAN CALENDAR */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0c0d12]/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/85 shadow-sm select-none">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <EthioLearnLogo size={42} showCardBackground={true} className="hover:rotate-6 duration-300 transition-all shrink-0" />
              <div className="leading-none text-left">
                <div className="flex items-center">
                  <span className="font-serif font-black text-slate-900 dark:text-white text-lg tracking-tight">EthioLearn</span>
                  <span className="text-[#078930] text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 ml-1.5 font-sans">PRO</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold">{profile.year} • {profile.university}</span>
              </div>
            </div>

            {isOffline && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.1 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-405 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {language === 'en' ? 'Offline' : 'ከዓለም አቀፍ መረብ ውጭ'}
              </span>
            )}
          </div>

          {/* Ethiopian Date Widget */}
          <div className="hidden md:flex items-center gap-2 border border-slate-200 dark:border-zinc-850 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl">
            <span className="text-sm">📅</span>
            <div className="text-left select-none">
              <span className="block font-bold text-slate-700 dark:text-zinc-200 text-[11px] leading-tight font-serif">{ethDate.formatted}</span>
              <span className="block text-[8.5px] text-[#078930] dark:text-emerald-500 font-black uppercase tracking-wider font-sans">Ge'ez Calendar Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bilingual Quick Selector */}
            <div className="flex bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-805 rounded-xl p-0.5">
              <button
                onClick={() => { setLanguage('en'); playClickChime(); }}
                className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  language === 'en' ? 'bg-[#078930] text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => { setLanguage('am'); playClickChime(); }}
                className={`text-[10.5px] font-extrabold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  language === 'am' ? 'bg-[#078930] text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                አማ
              </button>
            </div>

            {/* Interactive Theme Mode Toggle */}
            <button
              onClick={() => {
                const newTheme = themeMode === 'dark' ? 'light' : 'dark';
                setThemeMode(newTheme);
                playClickChime();
              }}
              className="p-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-450 cursor-pointer transition-colors"
              title={themeMode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {themeMode === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-slate-500 dark:text-zinc-405" />
              )}
            </button>

            {profile.isPro && (
              <div 
                onClick={() => { playClickChime(); setCurrentPage('upgrade'); }}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-600 dark:text-blue-400 text-xs font-bold leading-none cursor-pointer"
                title="Verified Pro Scholar"
              >
                <CheckCircle className="w-3.5 h-3.5 fill-blue-500 text-white dark:text-[#050508]" />
                <span className="text-[10px] uppercase font-black tracking-wider">Pro User</span>
              </div>
            )}

            <button
              onClick={handleProfileReset}
              className="p-2.5 border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 rounded-xl hover:bg-red-50 dark:hover:bg-zinc-800 hover:text-red-650 transition-all text-slate-500 dark:text-zinc-400 cursor-pointer"
              title="Reset Profile"
            >
              <UserIcon className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* CORE PAGES RENDER STAGE */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-6 md:py-8 pb-28">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentPage === 'home' && (
              <HomeDashboard 
                profile={profile}
                language={language}
                onNavigate={(page) => setCurrentPage(page as any)}
                onUpdateGrade={handleUpdateGrade}
                streakCount={streak}
                studyHoursCount={studyHours}
              />
            )}

            {currentPage === 'tutor' && (
              <AITutor 
                apiKey={profile.claudeApiKey || ""}
                enrolledSubjects={profile.subjects}
                decksState={decksState}
                onSaveDecksState={handleSaveDecksState}
                onStudyAction={handleRecordStudyAction}
                profile={profile}
                onUpdateProfile={handleUpdateProfile}
              />
            )}

            {currentPage === 'quiz' && (
              <ExamPrep 
                apiKey={profile.claudeApiKey || ""}
                enrolledSubjects={profile.subjects}
                onStudyAction={handleRecordStudyAction}
              />
            )}

            {currentPage === 'profile' && (
              <StudentProfileView 
                profile={profile}
                language={language}
                onUpdateProfile={handleUpdateProfile}
                streakCount={streak}
                studyHoursCount={studyHours}
                googleUser={googleUser}
                onGoogleSignIn={handleGoogleSignIn}
                onGoogleSignOut={handleGoogleSignOut}
                isInstallable={isInstallable}
                triggerPWAInstall={triggerPWAInstall}
              />
            )}

            {currentPage === 'notes' && (
              <StudyNotesView 
                apiKey={profile.claudeApiKey || ""}
                customNotes={customNotes}
                onSaveCustomNotes={handleSaveCustomNotes}
                enrolledSubjects={profile.subjects}
                googleUser={googleUser}
                googleToken={googleToken}
                onGoogleSignIn={handleGoogleSignIn}
                onGoogleSignOut={handleGoogleSignOut}
                decksState={decksState}
                onSaveDecksState={handleSaveDecksState}
                onOpenInAppViewer={(url, title) => { setInAppViewerUrl(url); setInAppViewerTitle(title); }}
              />
            )}

            {currentPage === 'bookstore' && (
              <BookStoreView 
                profile={profile}
                apiKey={profile.claudeApiKey || ""}
                language={language}
                onNavigate={(p) => setCurrentPage(p as any)}
                onStudyAction={handleRecordStudyAction}
                supabaseBooks={supabaseBooks}
                onOpenInAppViewer={(url, title) => { setInAppViewerUrl(url); setInAppViewerTitle(title); }}
              />
            )}

            {currentPage === 'university' && (
              <UniversityExamsView 
                profile={profile}
                apiKey={profile.claudeApiKey || ""}
                language={language}
                onNavigate={(p) => setCurrentPage(p as any)}
                onStudyAction={handleRecordStudyAction}
                onOpenInAppViewer={(url, title) => { setInAppViewerUrl(url); setInAppViewerTitle(title); }}
              />
            )}

            {currentPage === 'upgrade' && (
              <UpgradeProView 
                profile={profile}
                language={language}
                onUpdateProfile={handleUpdateProfile}
                onClose={() => setCurrentPage('home')}
              />
            )}

            {currentPage === 'examprep' && (
              <ExamNotesHubView 
                language={language}
                onClose={() => setCurrentPage('home')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* PERSISTENT BOTTOM NAVIGATION TAB BAR (Requirement) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c0d12]/95 border-t border-slate-200 dark:border-zinc-800/80 shadow-lg">
        {/* Shifting active color bar indicator */}
        <div className="grid grid-cols-6 max-w-2xl mx-auto h-[3px]">
          <div className={currentPage === 'home' ? "bg-[#078930]" : "bg-transparent"} />
          <div className={currentPage === 'tutor' ? "bg-[#078930]" : "bg-transparent"} />
          <div className={currentPage === 'quiz' ? "bg-[#078930]" : "bg-transparent"} />
          <div className={currentPage === 'bookstore' ? "bg-[#078930]" : "bg-transparent"} />
          <div className={currentPage === 'university' ? "bg-[#078930]" : "bg-transparent"} />
          <div className={currentPage === 'profile' ? "bg-[#078930]" : "bg-transparent"} />
        </div>

        <div className="grid grid-cols-6 max-w-2xl mx-auto px-1 py-1 select-none h-16">
          
          {/* Home Tab */}
          <button
            onClick={() => { playClickChime(); setCurrentPage('home'); }}
            className={`flex flex-col items-center justify-center w-full transition-all cursor-pointer rounded-xl ${
              currentPage === 'home' ? 'text-[#078930] dark:text-emerald-400 font-extrabold scale-105' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
          >
            <HomeIcon className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold mt-1">
              {language === 'en' ? 'Home' : 'ቤት'}
            </span>
          </button>

          {/* AI Tutor Tab */}
          <button
            onClick={() => { playClickChime(); setCurrentPage('tutor'); }}
            className={`flex flex-col items-center justify-center w-full transition-all cursor-pointer rounded-xl ${
              currentPage === 'tutor' ? 'text-[#078930] dark:text-emerald-400 font-extrabold scale-105' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
          >
            <Bot className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold mt-1">
              {language === 'en' ? 'AI Tutor' : 'የአይ ረዳት'}
            </span>
          </button>

          {/* Quizzes Tab */}
          <button
            onClick={() => { playClickChime(); setCurrentPage('quiz'); }}
            className={`flex flex-col items-center justify-center w-full transition-all cursor-pointer rounded-xl ${
              currentPage === 'quiz' ? 'text-[#078930] dark:text-emerald-400 font-extrabold scale-105' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
          >
            <Trophy className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold mt-1">
              {language === 'en' ? 'Quizzes' : 'ፈተናዎች'}
            </span>
          </button>

          {/* Book Store Tab */}
          <button
            onClick={() => { playClickChime(); setCurrentPage('bookstore'); }}
            className={`flex flex-col items-center justify-center w-full transition-all cursor-pointer rounded-xl ${
              currentPage === 'bookstore' ? 'text-[#078930] dark:text-emerald-400 font-extrabold scale-105' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
            title="Book Store MoDules"
          >
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold mt-1">
              {language === 'en' ? 'Books' : 'መጻሕፍት'}
            </span>
          </button>

          {/* University past exams Tab */}
          <button
            onClick={() => { playClickChime(); setCurrentPage('university'); }}
            className={`flex flex-col items-center justify-center w-full transition-all cursor-pointer rounded-xl ${
              currentPage === 'university' ? 'text-[#078930] dark:text-emerald-400 font-extrabold scale-105' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
            title="University Exams"
          >
            <Award className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold mt-1">
              {language === 'en' ? 'Uni Exam' : 'ዩኒቨርሲቲ'}
            </span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => { playClickChime(); setCurrentPage('profile'); }}
            className={`flex flex-col items-center justify-center w-full transition-all cursor-pointer rounded-xl ${
              currentPage === 'profile' ? 'text-[#078930] dark:text-emerald-400 font-extrabold scale-105' : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
            }`}
          >
            <UserIcon className="w-5 h-5 shrink-0" />
            <span className="text-[9px] font-semibold mt-1">
              {language === 'en' ? 'Profile' : 'መገለጫ'}
            </span>
          </button>
        </div>
      </nav>

      {/* Floating Popup Blocked Dialog for Main App */}
      {isPopupBlockedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#0c0d12] rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-serif text-base font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                  Google Sign-In Popup Blocked
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Your browser's popup blocker has blocked the Google Authentication window. This is common when running inside preview frames.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#078930]/5 dark:bg-[#078930]/10 border border-[#078930]/15 dark:border-[#078930]/35 rounded-xl space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
              <p>• <strong className="text-slate-800 dark:text-zinc-100">Recommended:</strong> Click the <strong className="text-[#078930] dark:text-emerald-400">"Open in new tab"</strong> button at the top right of this preview to connect securely.</p>
              <p>• <strong className="text-slate-800 dark:text-zinc-100">Alternative:</strong> Try signing in using the standard redirect flow below.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { playClickChime(); setIsPopupBlockedApp(false); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGoogleSignInRedirect}
                className="px-4 py-2 bg-[#078930] hover:bg-[#1A7A3C] text-white rounded-xl text-xs font-black uppercase cursor-pointer transition-all"
              >
                ⚡ Use Redirect Sign-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#078930] text-white px-4 py-3 rounded-xl text-xs font-serif font-black shadow-lg flex items-center gap-1.5 animate-bounce">
          <span>🎯</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global In-App Document & Web Viewer Modal Overlay */}
      {inAppViewerUrl && (
        <InAppViewerModal
          url={inAppViewerUrl}
          title={inAppViewerTitle}
          onClose={() => {
            setInAppViewerUrl(null);
            setInAppViewerTitle('');
          }}
        />
      )}

      {/* Floating conversational support assistant chat bubble */}
      <SupportChatBubble language={language} studentName={profile?.name} />
    </div>
  );
}
