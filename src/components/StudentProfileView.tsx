/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, Mail, GraduationCap, Award, Flame, BookOpen, Lock, 
  Edit3, Save, X, Clock, AlertCircle, Database, Check, ShieldAlert, KeyRound
} from 'lucide-react';
import { StudentProfile } from '../types';
import { playClickChime, playSuccessChime, playFailureChime } from '../utils/audio';
import { getSupabase } from '../utils/supabaseClient';
import StudentAvatar from './StudentAvatar';
import StudentAvatarSelector from './StudentAvatarSelector';
import PWADownloadAssistant from './PWADownloadAssistant';

interface StudentProfileViewProps {
  profile: StudentProfile;
  language: 'en' | 'am';
  onUpdateProfile: (updated: StudentProfile) => void;
  streakCount: number;
  studyHoursCount: number;
  googleUser?: any;
  onGoogleSignIn?: () => Promise<void>;
  onGoogleSignOut?: () => Promise<void>;
  isInstallable?: boolean;
  triggerPWAInstall?: () => Promise<void>;
}

export default function StudentProfileView({
  profile,
  language,
  onUpdateProfile,
  streakCount,
  studyHoursCount,
  googleUser,
  onGoogleSignIn,
  onGoogleSignOut,
  isInstallable,
  triggerPWAInstall
}: StudentProfileViewProps) {
  
  // Database State
  const [dbProfile, setDbProfile] = useState<StudentProfile | null>(null);
  const [dbStudySessions, setDbStudySessions] = useState<any[]>([]);
  const [dbPerformanceData, setDbPerformanceData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Edit Mode Toggle
  const [isEditing, setIsEditing] = useState(false);

  // Form Field States (Decoupled to prevent auto-save on keystroke)
  const [formName, setFormName] = useState('');
  const [formUniversity, setFormUniversity] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formSubjects, setFormSubjects] = useState<string[]>([]);
  const [formAvatar, setFormAvatar] = useState('');

  // Status message states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Change Password States
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Focus module subject pool
  const subjectsList = [
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

  // Load quiz history from local device storage
  const quizHistory = (() => {
    try {
      const stored = localStorage.getItem("ethiolearn_exam_sessions_history");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  })();

  // Calculate average practice score
  const averageScore = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((acc: number, item: any) => acc + (item.score || 0), 0) / quizHistory.length)
    : 0;

  // Load profile data directly from Supabase student_profiles table on mount
  const fetchProfileFromSupabase = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      const supa = getSupabase();
      if (!supa) {
        // Fallback to local profile if database connection credentials are not present
        setDbProfile(profile);
        setLoading(false);
        return;
      }

      const emailKey = (profile.email || '').toLowerCase().trim();
      if (!emailKey) {
        setDbProfile(profile);
        setLoading(false);
        return;
      }

      const { data, error } = await supa
        .from('student_profiles')
        .select('*')
        .eq('email', emailKey)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        if (data.profile_data) {
          setDbProfile(data.profile_data);
        } else {
          setDbProfile(profile);
        }
        setDbStudySessions(data.study_sessions || []);
        setDbPerformanceData(data.performance_data || {});
      } else {
        // Row doesn't exist yet, fallback to active prop profile
        setDbProfile(profile);
      }
    } catch (err: any) {
      console.error('[Supabase Fetch Error]:', err);
      setFetchError(err.message || 'Unable to connect to the central EthioLearn database server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileFromSupabase();
  }, [profile.email]);

  // Sync Form values whenever database profile is loaded
  useEffect(() => {
    if (dbProfile) {
      setFormName(dbProfile.name || '');
      setFormUniversity(dbProfile.university || '');
      setFormYear(dbProfile.year || 'Grade 12');
      setFormSubjects(dbProfile.subjects || []);
      setFormAvatar(dbProfile.avatar || 'star');
    }
  }, [dbProfile]);

  // Enter edit mode
  const handleStartEdit = () => {
    playClickChime();
    setIsEditing(true);
    setSaveSuccess(null);
    setSaveError(null);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    playClickChime();
    setIsEditing(false);
    setSaveError(null);
    // Reset form states to current database values
    if (dbProfile) {
      setFormName(dbProfile.name || '');
      setFormUniversity(dbProfile.university || '');
      setFormYear(dbProfile.year || 'Grade 12');
      setFormSubjects(dbProfile.subjects || []);
      setFormAvatar(dbProfile.avatar || 'star');
    }
  };

  // Save changes to database (Explicit submission - no auto-saves on keystroke)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setSaveError(language === 'en' ? "Please enter your full name." : "እባክዎን ሙሉ ስምዎን ያስገቡ።");
      playFailureChime();
      return;
    }
    if (!formUniversity.trim()) {
      setSaveError(language === 'en' ? "Please enter your university or school." : "እባክዎን ተቋም ወይም ትምህርት ቤት ያስገቡ።");
      playFailureChime();
      return;
    }
    if (formSubjects.length === 0) {
      setSaveError(language === 'en' ? "Please select at least one focus module." : "እባክዎን ቢያንስ አንድ የትምህርት ሞጁል ይምረጡ።");
      playFailureChime();
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const updatedProfile: StudentProfile = {
      ...profile,
      ...dbProfile,
      name: formName.trim(),
      university: formUniversity.trim(),
      year: formYear,
      subjects: formSubjects,
      avatar: formAvatar
    };

    try {
      const supa = getSupabase();
      if (supa) {
        const email = (profile.email || '').toLowerCase().trim();

        // Check if there is an existing password in database to preserve login compatibility
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
            ...updatedProfile,
            password
          },
          updated_at: new Date().toISOString()
        };

        const { error } = await supa
          .from('student_profiles')
          .upsert(payloadRecord, { onConflict: 'email' });

        if (error) {
          throw error;
        }
      }

      // Propagate state update up to parent context & LocalStorage
      onUpdateProfile(updatedProfile);
      setDbProfile(updatedProfile);
      
      playSuccessChime();
      setSaveSuccess(language === 'en' 
        ? "Your student profile has been securely updated." 
        : "የመገለጫ መረጃዎ በተሳካ ሁኔታ ተዘምኗል።"
      );
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      console.error('[Supabase Upsert Error]:', err);
      playFailureChime();
      setSaveError(err.message || 'Unable to persist changes in the cloud database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Separate password reset action flow using standard Supabase Auth reset functionality
  const handleTriggerPasswordReset = async () => {
    playClickChime();
    setResetLoading(true);
    setResetMessage(null);
    setResetError(null);

    const supa = getSupabase();
    if (!supa) {
      setResetError(language === 'en' 
        ? "Supabase client is offline. Contact campus administrator Ezra at ezrat2116@gmail.com." 
        : "ዳታቤዝ ግንኙነት የለም። እባክዎን የአካዳሚክ አስተዳዳሪውን እዝራን ያነጋግሩ (ezrat2116@gmail.com)።"
      );
      playFailureChime();
      setResetLoading(false);
      return;
    }

    try {
      const userEmail = (profile.email || '').toLowerCase().trim();
      const { error } = await supa.auth.resetPasswordForEmail(userEmail, {
        redirectTo: window.location.origin
      });

      if (error) {
        throw error;
      }

      playSuccessChime();
      setResetMessage(language === 'en'
        ? `A secure password reset link has been dispatched to ${userEmail}. Check your inbox or spam folder.`
        : `የይለፍ ቃል መቀየሪያ ሊንክ ወደ ${userEmail} ተልኳል። እባክዎን የኢሜይል ማህደርዎን ይመልከቱ።`
      );
    } catch (err: any) {
      console.error('[Supabase Reset Error]:', err);
      playFailureChime();
      setResetError(err.message || 'Failed to dispatch password reset request.');
    } finally {
      setResetLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4" id="profile-loading-container">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#C8962E] animate-spin"></div>
        </div>
        <p className="text-xs font-mono text-zinc-400 tracking-widest uppercase animate-pulse">
          {language === 'en' ? "Retrieving Student Record..." : "የተማሪ መረጃ በመጫን ላይ..."}
        </p>
      </div>
    );
  }

  // Render fetch failure error state with manual reload button (not a blank page)
  if (fetchError) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto" id="profile-error-container">
        <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-full text-red-500 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-serif text-lg font-bold text-red-400 mb-2">
          {language === 'en' ? "Database Sync Error" : "የዳታቤዝ ግንኙነት ችግር"}
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed font-sans mb-6">
          {fetchError}
        </p>
        <button
          onClick={fetchProfileFromSupabase}
          className="px-5 py-2.5 bg-[#C8962E] hover:bg-[#b08123] text-black font-serif font-black text-xs tracking-wider uppercase rounded-xl transition-all cursor-pointer flex items-center gap-2"
        >
          {language === 'en' ? "Retry Database Connection" : "እንደገና ይሞክሩ"}
        </button>
      </div>
    );
  }

  const activeProfileData = dbProfile || profile;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-1" id="student-profile-hub">
      {/* Page Title & Breadcrumb header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
        <div>
          <h2 className="font-serif text-2xl font-black text-[#C8962E] tracking-tight">
            {language === 'en' ? "Student Academic Hub" : "የተማሪ አካዳሚክ ማዕከል"}
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mt-1">
            {language === 'en' ? "EthioLearn Pro Campus Registry" : "የኢትዮለርን ፕሮ የተማሪ ካርድ መዝገብ"}
          </p>
        </div>
        
        {/* Save messages / notification badge */}
        {saveSuccess && (
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
      </div>

      {/* Render the PWA download/install assistant here */}
      <PWADownloadAssistant 
        isInstallable={isInstallable || false} 
        triggerPWAInstall={triggerPWAInstall || (async () => {})} 
        isOffline={!navigator.onLine}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Interactive Digital Student ID Card */}
        <div className="md:col-span-1 space-y-6">
          {/* Digital ID Card */}
          <div className="relative bg-gradient-to-b from-[#111] to-[#050505] rounded-2xl border-2 border-[#C8962E]/50 shadow-2xl p-5 overflow-hidden group">
            {/* National Accent Stripes */}
            <div className="absolute top-0 inset-x-0 h-1 flex">
              <div className="bg-emerald-500 h-full w-1/3" />
              <div className="bg-amber-400 h-full w-1/3" />
              <div className="bg-red-500 h-full w-1/3" />
            </div>

            {/* Chip Graphic and Network status */}
            <div className="flex justify-between items-center mb-6 pt-2">
              <div className="w-9 h-7 bg-gradient-to-br from-amber-500/30 to-yellow-600/15 border border-amber-600/40 rounded-md flex flex-col justify-between p-1">
                <div className="h-0.5 w-full bg-amber-600/30" />
                <div className="h-0.5 w-3/4 bg-amber-600/30" />
                <div className="h-0.5 w-full bg-amber-600/30" />
              </div>
              <div className="px-2 py-0.5 rounded-full bg-[#C8962E]/10 border border-[#C8962E]/20 text-[#C8962E] font-mono text-[8px] uppercase tracking-widest">
                {activeProfileData.isPro ? "PRO CAMPUS" : "STANDARD"}
              </div>
            </div>

            {/* Profile Picture Display */}
            <div className="flex flex-col items-center text-center space-y-3 pb-4">
              <div className="relative">
                <StudentAvatar 
                  avatar={activeProfileData.avatar} 
                  name={activeProfileData.name} 
                  size={92} 
                  className="border-2 border-[#C8962E] shadow-[0_0_15px_rgba(200,150,46,0.35)]"
                />
              </div>

              <div>
                <h3 className="font-serif text-lg font-bold text-[#F0EDE8] tracking-tight truncate max-w-[220px]">
                  {activeProfileData.name}
                </h3>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-400 uppercase mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#C8962E]" />
                  {activeProfileData.year}
                </span>
              </div>
            </div>

            {/* Locked Info Lines */}
            <div className="border-t border-zinc-900 pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-mono uppercase text-[9px] tracking-wider">Campus Email</span>
                <span className="text-[#F0EDE8] font-semibold font-mono truncate max-w-[140px] text-right" title={activeProfileData.email}>
                  {activeProfileData.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-mono uppercase text-[9px] tracking-wider">Institution</span>
                <span className="text-zinc-300 font-semibold truncate max-w-[140px] text-right" title={activeProfileData.university}>
                  {activeProfileData.university}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 font-mono uppercase text-[9px] tracking-wider">System ID</span>
                <span className="text-zinc-600 font-mono text-[10px] select-all">
                  EL-{activeProfileData.email ? Math.abs(activeProfileData.email.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0)).toString().substring(0, 5) : '8327'}
                </span>
              </div>
            </div>
          </div>

          {/* Change Password option that links to a separate secure flow */}
          <div className="bg-[#111111]/90 rounded-2xl border border-zinc-900 p-5 space-y-4">
            <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-900 pb-2">
              <KeyRound className="w-4 h-4 text-[#C8962E]" />
              {language === 'en' ? "Access Security" : "የደህንነት ቁጥጥር"}
            </h4>

            <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
              {language === 'en'
                ? "Manage your credentials securely. Password modification operates via a remote encrypted verification flow to protect student data."
                : "የይለፍ ቃልዎን በአስተማማኝ ሁኔታ ለመቀየር የኢሜይል ማረጋገጫ ሊንክ መላክ ይችላሉ።"}
            </p>

            {resetMessage && (
              <p className="p-2.5 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] leading-normal font-sans">
                {resetMessage}
              </p>
            )}

            {resetError && (
              <p className="p-2.5 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-[11px] leading-normal font-sans">
                {resetError}
              </p>
            )}

            <button
              onClick={handleTriggerPasswordReset}
              disabled={resetLoading}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-serif font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {resetLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#C8962E]" />
              )}
              <span>{language === 'en' ? "Request Password Reset" : "የይለፍ ቃል መቀየርያ ሊንክ ላክ"}</span>
            </button>
          </div>
        </div>

        {/* Center/Right Column: Display/Edit Hub & Study Stats */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Main profile form or view card */}
          <div className="bg-[#111111]/90 rounded-2xl border border-zinc-900 p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#C8962E]" />
                <h3 className="font-serif text-base font-bold text-[#F0EDE8]">
                  {isEditing 
                    ? (language === 'en' ? "Modify Profile Specifications" : "የተማሪ መገለጫ ማስተካከያ") 
                    : (language === 'en' ? "Student Academic Registration" : "የአካዳሚክ ምዝገባ መረጃዎች")
                  }
                </h3>
              </div>
              
              {!isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="px-3.5 py-1.5 bg-[#C8962E] hover:bg-[#b08123] text-black font-serif font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{language === 'en' ? "Edit profile" : "መገለጫ አስተካክል"}</span>
                </button>
              )}
            </div>

            {saveError && (
              <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSaveChanges} className="space-y-6">
                
                {/* 1. Avatar Selection inside Edit Mode */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">
                    {language === 'en' ? "1. Select Student Identity Portrait" : "፩. የተማሪ አምሳያ ይምረጡ"}
                  </label>
                  <StudentAvatarSelector
                    currentAvatar={formAvatar}
                    name={formName || 'Student'}
                    onChange={setFormAvatar}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* 2. Full Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                      {language === 'en' ? "Full Name" : "ሙሉ ስም"}
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Abebe Kebede"
                      className="w-full bg-[#090909] border border-zinc-800 text-zinc-100 text-xs rounded-xl px-4 py-3 outline-none focus:border-[#C8962E] transition-all font-sans"
                    />
                  </div>

                  {/* 3. Academic Level (Standing) Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                      {language === 'en' ? "Academic Standing" : "የትምህርት ደረጃ"}
                    </label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(e.target.value)}
                      className="w-full bg-[#090909] border border-zinc-800 text-zinc-100 text-xs rounded-xl px-3 py-3 outline-none focus:border-[#C8962E] transition-all font-sans cursor-pointer"
                    >
                      <option value="Grade 12" className="bg-[#111]">{language === 'en' ? "Grade 12 (Freshman Prep)" : "ክፍል 12 (ዩኒቨርሲቲ መግቢያ)"}</option>
                      <option value="University" className="bg-[#111]">{language === 'en' ? "University Student" : "የዩኒቨርሲቲ ተማሪ"}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 4. University / High School Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
                      {language === 'en' ? "University or High School" : "ተቋም ወይም ትምህርት ቤት"}
                    </label>
                    <input
                      type="text"
                      value={formUniversity}
                      onChange={(e) => setFormUniversity(e.target.value)}
                      placeholder="e.g. Addis Ababa University"
                      className="w-full bg-[#090909] border border-zinc-800 text-zinc-100 text-xs rounded-xl px-4 py-3 outline-none focus:border-[#C8962E] transition-all font-sans"
                    />
                  </div>

                  {/* 5. Read-Only Email Field (Authentic bound) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block font-mono flex items-center gap-1">
                      <span>{language === 'en' ? "Auth-Linked Email" : "ከመለያ ጋር የተገናኘ ኢሜይል"}</span>
                      <Lock className="w-3 h-3 text-zinc-650" />
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={activeProfileData.email || ''}
                        disabled
                        className="w-full bg-[#050505] border border-zinc-900 text-zinc-500 text-xs rounded-xl px-4 py-3 cursor-not-allowed outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Enrolled Focus Modules Selection */}
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block font-mono">
                    {language === 'en' ? "2. Active Focus Modules (Select one or more)" : "፪. ንቁ የጥናት ሞጁሎች (አንድ ወይም ከዚያ በላይ ይምረጡ)"}
                  </label>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    {language === 'en' 
                      ? "Courses assigned to your digital learning profile. AI study blueprints and mock exams will auto-adapt to these modules."
                      : "ለጥናት መገለጫዎ የተመደቡ ትምህርቶች። የአይ መማሪያው እና የፈተና ሙከራዎች ከእነዚህ ጋር ይስማማሉ።"}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {subjectsList.map((subj) => {
                      const isSelected = formSubjects.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (formSubjects.length > 1) {
                                setFormSubjects(formSubjects.filter(s => s !== subj));
                              }
                            } else {
                              setFormSubjects([...formSubjects, subj]);
                            }
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-[#C8962E] bg-[#C8962E]/10 text-[#C8962E]' 
                              : 'border-zinc-800 bg-[#070707] text-zinc-400 hover:border-zinc-700 hover:text-zinc-350'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-[#C8962E] bg-[#C8962E]' : 'border-zinc-800 bg-zinc-950'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-black stroke-[3.5px]" />}
                          </span>
                          <span className="truncate font-sans font-medium">{subj}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 font-serif font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    {language === 'en' ? "Cancel" : "ይቅር"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-[#C8962E] hover:bg-[#b08123] text-black font-serif font-black text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSaving ? (language === 'en' ? "Saving..." : "በማስቀመጥ ላይ...") : (language === 'en' ? "Save Changes" : "ለውጦችን አስቀምጥ")}</span>
                  </button>
                </div>
              </form>
            ) : (
              // Display/View Mode
              <div className="space-y-6">
                {/* 2-Column Info Display */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{language === 'en' ? "Full Name" : "ሙሉ ስም"}</span>
                    <p className="text-sm font-semibold text-zinc-100 font-serif">{activeProfileData.name}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{language === 'en' ? "Auth Email" : "መለያ ኢሜይል"}</span>
                    <p className="text-sm font-semibold text-zinc-400 font-mono flex items-center gap-1.5">
                      <span>{activeProfileData.email}</span>
                      <Lock className="w-3.5 h-3.5 text-zinc-650" />
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{language === 'en' ? "Academic Level" : "ደረጃ"}</span>
                    <p className="text-sm font-semibold text-zinc-100 font-serif">{activeProfileData.year}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">{language === 'en' ? "Institution" : "ተቋም / ትምህርት ቤት"}</span>
                    <p className="text-sm font-semibold text-[#C8962E] font-serif">{activeProfileData.university}</p>
                  </div>
                </div>

                {/* Display Enrolled Subjects/Focus Modules as beautiful badges */}
                <div className="space-y-2.5 pt-4 border-t border-zinc-900">
                  <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                    {language === 'en' ? "Enrolled Academic Focus Modules" : "የተመዘገቡ የትምህርት ሞጁሎች"}
                  </span>
                  
                  {activeProfileData.subjects && activeProfileData.subjects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeProfileData.subjects.map((subj) => (
                        <div 
                          key={subj}
                          className="px-3 py-1.5 bg-zinc-950/60 border border-zinc-900 text-zinc-300 text-xs rounded-xl font-medium font-sans flex items-center gap-1.5"
                        >
                          <div className="w-1.5 h-1.5 bg-[#C8962E] rounded-full" />
                          <span>{subj}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 font-serif">
                      {language === 'en' ? "No focus modules selected yet." : "እስካሁን የተመረጠ የጥናት ሞጁል የለም።"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Genuine Academic Statistics Summary */}
          <div className="bg-[#111111]/90 rounded-2xl border border-zinc-900 p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Award className="w-4.5 h-4.5 text-[#C8962E]" />
              <h4 className="font-serif text-sm font-black text-[#F0EDE8] uppercase tracking-wide">
                {language === 'en' ? "Academic Learning Analytics Summary" : "የአካዳሚክ ጥናት መረጃ ማጠቃለያ"}
              </h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Stat 1: Enrolled Courses */}
              <div className="p-3.5 bg-zinc-950/45 border border-zinc-900/80 rounded-2xl text-center">
                <span className="block text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">
                  {language === 'en' ? "Focus Courses" : "ሞጁሎች"}
                </span>
                <span className="font-mono text-xl font-black text-[#C8962E] block">
                  {activeProfileData.subjects ? activeProfileData.subjects.length : 0}
                </span>
                <span className="text-[9px] font-sans text-zinc-600 font-medium block mt-1 leading-none">
                  In Progress
                </span>
              </div>

              {/* Stat 2: Study Streak */}
              <div className="p-3.5 bg-zinc-950/45 border border-zinc-900/80 rounded-2xl text-center">
                <span className="block text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">
                  {language === 'en' ? "Study Streak" : "ቀጣይነት"}
                </span>
                <span className="font-mono text-xl font-black text-emerald-555 block flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-emerald-500 shrink-0 fill-emerald-500/20" />
                  <span className="text-emerald-400">{streakCount}</span>
                </span>
                <span className="text-[9px] font-sans text-zinc-600 font-medium block mt-1 leading-none">
                  Days Active
                </span>
              </div>

              {/* Stat 3: Study Hours */}
              <div className="p-3.5 bg-zinc-950/45 border border-zinc-900/80 rounded-2xl text-center">
                <span className="block text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">
                  {language === 'en' ? "Total Study" : "አጠቃላይ ሰዓት"}
                </span>
                <span className="font-mono text-xl font-black text-amber-500 block">
                  {dbStudySessions.length > 0 
                    ? (dbStudySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60).toFixed(1)
                    : studyHoursCount.toFixed(1)
                  }h
                </span>
                <span className="text-[9px] font-sans text-zinc-600 font-medium block mt-1 leading-none">
                  Hours Logged
                </span>
              </div>

              {/* Stat 4: Quizzes completed */}
              <div className="p-3.5 bg-zinc-950/45 border border-zinc-900/80 rounded-2xl text-center">
                <span className="block text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">
                  {language === 'en' ? "Quizzes Submitted" : "ፈተናዎች"}
                </span>
                <span className="font-mono text-xl font-black text-zinc-200 block">
                  {quizHistory.length}
                </span>
                <span className="text-[9px] font-sans text-zinc-650 block mt-1 leading-none font-bold">
                  {quizHistory.length > 0 ? `${averageScore}% Avg` : "No attempts"}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
