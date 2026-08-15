import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Bot, BookOpen, Play, GraduationCap, FileText, Bell, Star, Clock, CheckCircle2, 
  Flame, Calendar, Target, CheckSquare, Square, TrendingUp, ArrowRight, 
  ShieldCheck, X, ChevronRight, Bookmark, Award, Plus, Trash2, RefreshCw,
  AlertCircle, Sparkles, BookCheck, HelpCircle, Layers, CheckCircle, BarChart3,
  ExternalLink, Compass, Lightbulb, BrainCircuit, ArrowUpRight
} from 'lucide-react';
import { 
  StudentProfile, CourseRecord, PlatformAnnouncement, StudyTask, ExamAttemptRecord, 
  StudentCourseProgress, AITeacherContext 
} from '../types';
import { playClickChime, playSuccessChime, playFailureChime } from '../utils/audio';
import { safeStorage } from '../utils/safeStorage';
import { getEthiopianDate, toGeezNumeral, ETHIOPIAN_HOLIDAYS } from '../utils/ethiopianCalendar';
import { 
  fetchPublishedCourses, fetchAnnouncements, fetchAllStudentCourseProgresses, 
  fetchStudentExamAttempts, fetchStudentTasks, saveStudentTask, 
  toggleStudentTaskStatus, deleteStudentTask 
} from '../utils/supabaseCourses';

interface HomeDashboardProps {
  profile: StudentProfile;
  language: 'en' | 'am' | 'both';
  onNavigate: (page: 'home' | 'tutor' | 'quiz' | 'profile' | 'notes' | 'examprep' | 'bookstore' | 'university' | 'courses' | 'examengine', context?: AITeacherContext) => void;
  onUpdateGrade: (grade: string) => void;
  streakCount: number;
  studyHoursCount: number;
  onSelectCourse?: (courseId: string) => void;
}

export default function HomeDashboard({
  profile,
  language,
  onNavigate,
  onUpdateGrade,
  streakCount,
  studyHoursCount,
  onSelectCourse
}: HomeDashboardProps) {
  const isAmharic = language === 'am';
  const userId = profile.email || profile.name || 'guest_user';

  // Live Ethiopian Ge'ez Calendar
  const ethDate = useMemo(() => getEthiopianDate(new Date()), []);
  const geezDayNumeral = useMemo(() => toGeezNumeral(ethDate.day), [ethDate.day]);

  // Check for today's Ethiopian holiday if any
  const todayHoliday = useMemo(() => {
    return ETHIOPIAN_HOLIDAYS.find(
      h => h.day === ethDate.day && h.monthIndex === ethDate.monthIndex
    );
  }, [ethDate.day, ethDate.monthIndex]);

  // Greeting based on time of day
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (isAmharic) {
      if (hour < 12) return 'እንደምን አደሩ';
      if (hour < 17) return 'እንደምን ዋሉ';
      return 'እንደምን አመሹ';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, [isAmharic]);

  // --------------------------------------------------------------------------
  // REAL DATABASE STATE
  // --------------------------------------------------------------------------
  const activeLevel = profile.year === 'University' ? 'University' : 'Grade 12';
  
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [progressMap, setProgressMap] = useState<{ [courseId: string]: StudentCourseProgress }>({});
  const [examAttempts, setExamAttempts] = useState<ExamAttemptRecord[]>([]);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Target Goal State (Daily study goal in hours)
  const [targetHours, setTargetHours] = useState<number>(() => {
    const saved = safeStorage.getItem(`ethiolearn_target_hours_${userId}`);
    return saved ? parseFloat(saved) : (profile.dailyGoalHours || 3.0);
  });

  // UI Modals & Drawers
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState(profile.subjects?.[0] || 'General');
  const [newTaskDuration, setNewTaskDuration] = useState('25m');
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem(`ethiolearn_read_announcements_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Bookmarked / Starred courses
  const [bookmarkedCourseIds, setBookmarkedCourseIds] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem(`ethiolearn_bookmarked_courses_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --------------------------------------------------------------------------
  // LOAD ALL REAL DATABASE RECORDS (Deduplicated & Synchronized)
  // --------------------------------------------------------------------------
  const loadDashboardData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setLoadError(null);

    try {
      // Parallel fetch real database endpoints
      const [
        fetchedCourses,
        fetchedProgress,
        fetchedAttempts,
        fetchedTasks,
        fetchedAnnouncements
      ] = await Promise.all([
        fetchPublishedCourses(activeLevel),
        fetchAllStudentCourseProgresses(userId),
        fetchStudentExamAttempts(userId),
        fetchStudentTasks(userId),
        fetchAnnouncements(true)
      ]);

      // Deduplicate courses strictly by ID
      const uniqueCourses: CourseRecord[] = [];
      const seenCourseIds = new Set<string>();
      for (const c of fetchedCourses) {
        if (!seenCourseIds.has(c.id)) {
          seenCourseIds.add(c.id);
          uniqueCourses.push(c);
        }
      }

      setCourses(uniqueCourses);
      setProgressMap(fetchedProgress || {});
      setExamAttempts(fetchedAttempts || []);
      setTasks(fetchedTasks || []);
      setAnnouncements(fetchedAnnouncements || []);
    } catch (err: any) {
      console.error('Failed to load real dashboard data:', err);
      setLoadError(isAmharic ? 'የጥናት መረጃን መጫን አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Unable to load your learning data from the server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeLevel, userId, isAmharic]);

  useEffect(() => {
    loadDashboardData();

    // Listen for cross-component database updates (e.g. after publishing a course or completing a quiz)
    const handleDataUpdate = () => {
      loadDashboardData(true);
    };
    window.addEventListener('ethiolearn_data_updated', handleDataUpdate);
    return () => window.removeEventListener('ethiolearn_data_updated', handleDataUpdate);
  }, [loadDashboardData]);

  // --------------------------------------------------------------------------
  // DERIVED REAL STATISTICS (Zero fake stats)
  // --------------------------------------------------------------------------
  // Active courses that student has progress in
  const enrolledCoursesWithProgress = useMemo(() => {
    return courses.map(course => {
      const prog = progressMap[course.id];
      const progressPercentage = prog?.progressPercentage || 0;
      const completedCount = prog?.completedLessonsCount || 0;
      const lastAccessed = prog?.lastUpdated || null;
      return {
        course,
        progressPercentage,
        completedCount,
        lastAccessed
      };
    });
  }, [courses, progressMap]);

  // In-progress courses (progress > 0 and < 100) or recently accessed
  const inProgressCourses = useMemo(() => {
    return enrolledCoursesWithProgress
      .filter(item => item.progressPercentage > 0)
      .sort((a, b) => {
        const timeA = a.lastAccessed ? new Date(a.lastAccessed).getTime() : 0;
        const timeB = b.lastAccessed ? new Date(b.lastAccessed).getTime() : 0;
        return timeB - timeA;
      });
  }, [enrolledCoursesWithProgress]);

  // Most recently accessed course for the "Continue Learning" button
  const mostRecentCourse = useMemo(() => {
    if (inProgressCourses.length > 0) {
      return inProgressCourses[0].course;
    }
    return courses[0] || null;
  }, [inProgressCourses, courses]);

  // Aggregate metrics
  const totalCoursesEnrolled = inProgressCourses.length;
  const totalCoursesCompleted = enrolledCoursesWithProgress.filter(c => c.progressPercentage === 100).length;
  const totalExamsCompleted = examAttempts.length;
  
  // Real average exam score across actual attempts
  const averageExamScore = useMemo(() => {
    if (examAttempts.length === 0) return null;
    const sum = examAttempts.reduce((acc, curr) => acc + (curr.percentage || curr.score || 0), 0);
    return Math.round(sum / examAttempts.length);
  }, [examAttempts]);

  // Real aggregated weak topics from past attempts
  const identifiedWeakTopics = useMemo(() => {
    const topicMap: { [topic: string]: number } = {};
    examAttempts.forEach(attempt => {
      if (Array.isArray(attempt.weakTopics)) {
        attempt.weakTopics.forEach(t => {
          if (t && typeof t === 'string') {
            topicMap[t] = (topicMap[t] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic)
      .slice(0, 4);
  }, [examAttempts]);

  // Overall curriculum completion %
  const overallProgressPercentage = useMemo(() => {
    if (courses.length === 0) return 0;
    const totalProg = enrolledCoursesWithProgress.reduce((sum, item) => sum + item.progressPercentage, 0);
    return Math.round(totalProg / courses.length);
  }, [courses.length, enrolledCoursesWithProgress]);

  // Check if student has any recorded study activity at all
  const hasAnyActivity = totalCoursesEnrolled > 0 || totalExamsCompleted > 0 || streakCount > 0 || studyHoursCount > 0;

  // --------------------------------------------------------------------------
  // ACTIONS & HANDLERS
  // --------------------------------------------------------------------------
  const handleUpdateTargetHours = (delta: number) => {
    playClickChime();
    setTargetHours(prev => {
      const next = Math.max(1, Math.min(10, +(prev + delta).toFixed(1)));
      safeStorage.setItem(`ethiolearn_target_hours_${userId}`, next.toString());
      return next;
    });
  };

  const handleToggleTask = async (task: StudyTask) => {
    playSuccessChime();
    const updatedStatus = !task.isCompleted;
    // Optimistic UI update
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isCompleted: updatedStatus } : t));
    await toggleStudentTaskStatus(task.id, updatedStatus, userId);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    playClickChime();
    const newTask = {
      title: newTaskTitle.trim(),
      subject: newTaskSubject.trim() || 'General',
      duration: newTaskDuration.trim() || '25m',
      durationMinutes: parseInt(newTaskDuration, 10) || 25,
      isCompleted: false,
      type: 'review'
    };

    const res = await saveStudentTask(newTask, userId);
    if (res.success && res.task) {
      playSuccessChime();
      setTasks(prev => [res.task, ...prev]);
      setNewTaskTitle('');
      setShowAddTaskModal(false);
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickChime();
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await deleteStudentTask(taskId, userId);
  };

  const handleToggleBookmark = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickChime();
    setBookmarkedCourseIds(prev => {
      const updated = prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId];
      safeStorage.setItem(`ethiolearn_bookmarked_courses_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAnnouncementRead = (annId: string) => {
    setReadAnnouncementIds(prev => {
      if (prev.includes(annId)) return prev;
      const updated = [...prev, annId];
      safeStorage.setItem(`ethiolearn_read_announcements_${userId}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleMarkAllAnnouncementsRead = () => {
    playSuccessChime();
    const allIds = announcements.map(a => a.id);
    setReadAnnouncementIds(allIds);
    safeStorage.setItem(`ethiolearn_read_announcements_${userId}`, JSON.stringify(allIds));
  };

  const unreadAnnouncementsCount = announcements.filter(a => !readAnnouncementIds.includes(a.id)).length;

  const completedTasksCount = tasks.filter(t => t.isCompleted).length;
  const goalProgressPercentage = Math.min(100, Math.round((studyHoursCount / targetHours) * 100));

  // AI Teacher prompt helpers
  const handleOpenAIWithPrompt = (promptType: 'explain' | 'quiz' | 'summarize' | 'flashcards' | 'difficult') => {
    playClickChime();
    const activeSubject = mostRecentCourse?.subject || profile.subjects?.[0] || 'General';
    const activeTitle = mostRecentCourse?.title || 'Academic Coursework';

    let promptContext: AITeacherContext = {
      mode: 'teaching',
      courseTitle: activeTitle,
      subject: activeSubject
    };

    if (promptType === 'quiz') {
      promptContext.mode = 'quiz';
    }

    onNavigate('tutor', promptContext);
  };

  // --------------------------------------------------------------------------
  // RENDER SKELETON LOADERS
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse text-slate-800 dark:text-slate-100">
        {/* Top Header Skeleton */}
        <div className="h-10 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between px-4" />
        
        {/* Welcome Banner Skeleton */}
        <div className="h-44 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-6 space-y-4">
          <div className="w-48 h-4 bg-slate-800 rounded" />
          <div className="w-80 h-7 bg-slate-800 rounded" />
          <div className="w-64 h-4 bg-slate-800 rounded" />
        </div>

        {/* Learning Overview Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-24 bg-slate-900/80 rounded-xl border border-slate-800/80 p-4" />
          ))}
        </div>

        {/* 2-Column Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5" />
          <div className="h-64 bg-slate-900/80 rounded-2xl border border-slate-800/80 p-5" />
        </div>
      </div>
    );
  }

  return (
    <div id="etlearn-dashboard-root" className="w-full space-y-7 text-slate-100 font-sans">
      
      {/* ─── ERROR STATE BANNER (If query fails) ─── */}
      {loadError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-700/60 text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isAmharic ? 'እንደገና ሞክር' : 'Try Again'}</span>
          </button>
        </div>
      )}

      {/* ─── 1. TOP SUB-BAR (Calendar & Verified Announcements) ─── */}
      <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Ge'ez Academic Calendar Date */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-slate-200">
              {ethDate.monthName} {ethDate.day} ({geezDayNumeral}), {ethDate.year} ዓ.ም.
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
              {isAmharic ? 'የአካዳሚክ ቀን' : 'Academic'}
            </span>
          </div>

          {/* Holiday notice if active */}
          {todayHoliday && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isAmharic ? todayHoliday.nameAm : todayHoliday.nameEn}</span>
            </span>
          )}
        </div>

        {/* Action Controls: Refresh & Notification Drawer */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
            title={isAmharic ? 'መረጃ አድስ' : 'Refresh Dashboard'}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              onClick={() => { playClickChime(); setShowNotifications(!showNotifications); }}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-amber-400 hover:border-slate-700 transition-all relative cursor-pointer flex items-center gap-1.5 text-xs font-medium"
              title={isAmharic ? 'ማስታወቂያዎች' : 'Platform Announcements'}
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-xs text-slate-300">
                {isAmharic ? 'ማስታወቂያ' : 'Notices'}
              </span>
              {unreadAnnouncementsCount > 0 && (
                <span className="w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center">
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {isAmharic ? 'የዩኒቨርሲቲ ማስታወቂያዎች' : 'Campus Announcements'}
                    </span>
                  </div>
                  {unreadAnnouncementsCount > 0 && (
                    <button
                      onClick={handleMarkAllAnnouncementsRead}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer font-medium"
                    >
                      {isAmharic ? 'ሁሉንም አንብብ' : 'Mark all read'}
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {announcements.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {isAmharic ? 'ምንም አዲስ ማስታወቂያ የለም።' : 'No announcements published at this time.'}
                    </div>
                  ) : (
                    announcements.map(ann => {
                      const isRead = readAnnouncementIds.includes(ann.id);
                      return (
                        <div
                          key={ann.id}
                          onClick={() => { 
                            handleMarkAnnouncementRead(ann.id);
                            setSelectedAnnouncement(ann); 
                            setShowNotifications(false); 
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            isRead 
                              ? 'bg-slate-950/40 border-slate-800 text-slate-400' 
                              : 'bg-slate-950 border-amber-500/30 text-slate-100 hover:border-amber-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-[12px] text-slate-100 line-clamp-1">{ann.title}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{ann.date}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{ann.message}</p>
                          {ann.badgeText && (
                            <span className="inline-block mt-1.5 text-[9px] px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
                              {ann.badgeText}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. PERSONALIZED WELCOME HERO SECTION ─── */}
      <section className="p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-[#111C35] via-[#0F172A] to-[#0A1128] border border-slate-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Real University / Department / Year Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {profile.university && (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                  {profile.university}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 text-xs font-medium">
                {profile.year || 'University Student'}
              </span>
              {profile.subjects && profile.subjects[0] && (
                <span className="px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60 text-xs font-medium">
                  {profile.subjects[0]}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {greetingText}, {profile.name || 'Scholar'}
              </h1>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                {isAmharic 
                  ? 'የጥናት ጉዞዎን ይቀጥሉ። የኮርስ ሞጁሎች፣ AI መምህር እና የፈተና ሞዴሎች ዝግጁ ናቸው።' 
                  : 'Continue your learning journey. Your curriculum modules, AI teacher, and practice exams are synced.'}
              </p>
            </div>

            {/* Real Learning Progress Metadata */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
              <div>
                <span className="text-slate-400">{isAmharic ? 'የተጀመሩ ኮርሶች: ' : 'Courses in progress: '}</span>
                <span className="font-semibold text-slate-200">{totalCoursesEnrolled}</span>
              </div>
              <span className="text-slate-700">•</span>
              <div>
                <span className="text-slate-400">{isAmharic ? 'አጠቃላይ እድገት: ' : 'Overall curriculum progress: '}</span>
                <span className="font-semibold text-amber-400 font-mono">{overallProgressPercentage}%</span>
              </div>
            </div>
          </div>

          {/* Two Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => {
                playClickChime();
                if (mostRecentCourse && onSelectCourse) {
                  onSelectCourse(mostRecentCourse.id);
                } else {
                  onNavigate('courses');
                }
              }}
              className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shadow-amber-500/20 active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-slate-950" />
              <span>{isAmharic ? 'ትምህርት ቀጥል' : 'Continue Learning'}</span>
            </button>

            <button
              onClick={() => {
                playClickChime();
                onNavigate('tutor', {
                  mode: 'teaching',
                  courseTitle: mostRecentCourse?.title,
                  subject: mostRecentCourse?.subject
                });
              }}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-750 text-slate-200 font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 hover:border-amber-500/40 active:scale-[0.98]"
            >
              <Bot className="w-4 h-4 text-amber-400" />
              <span>{isAmharic ? 'AI መምህርን ጠይቅ' : 'Ask AI Teacher'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 3. LEARNING OVERVIEW (100% Real Database Values - Zero Fake Stats) ─── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isAmharic ? 'የጥናት አጠቃላይ መረጃ' : 'Learning Overview'}
          </h2>
          <span className="text-[11px] text-slate-500">
            {isAmharic ? 'የተረጋገጠ የተማሪ መረጃ' : 'Verified Student Metrics'}
          </span>
        </div>

        {/* Compact Grid of Real Database Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Metric 1: Courses Enrolled */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 block mb-1">
              {isAmharic ? 'የተጀመሩ ኮርሶች' : 'Courses Enrolled'}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white font-mono">{totalCoursesEnrolled}</span>
              <BookOpen className="w-4 h-4 text-amber-400/70" />
            </div>
          </div>

          {/* Metric 2: Courses Completed */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 block mb-1">
              {isAmharic ? 'የተጠናቀቁ ኮርሶች' : 'Courses Completed'}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-emerald-400 font-mono">{totalCoursesCompleted}</span>
              <CheckCircle className="w-4 h-4 text-emerald-400/70" />
            </div>
          </div>

          {/* Metric 3: Exams Completed */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 block mb-1">
              {isAmharic ? 'የተወሰዱ ፈተናዎች' : 'Exams Completed'}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white font-mono">{totalExamsCompleted}</span>
              <GraduationCap className="w-4 h-4 text-amber-400/70" />
            </div>
          </div>

          {/* Metric 4: Study Streak */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs text-slate-400 block mb-1">
              {isAmharic ? 'የቀናት ቀጣይነት' : 'Study Streak'}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-400 font-mono">
                {streakCount} {streakCount === 1 ? 'day' : 'days'}
              </span>
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            </div>
          </div>

          {/* Metric 5: Total Study Time */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs text-slate-400 block mb-1">
              {isAmharic ? 'አጠቃላይ የጥናት ሰዓት' : 'Total Study Time'}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-bold text-white font-mono">
                {studyHoursCount} hrs
              </span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Meaningful empty state banner if student has no recorded activity yet */}
        {!hasAnyActivity && (
          <div className="mt-3 p-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {isAmharic 
                  ? 'እስካሁን ምንም የጥናት እንቅስቃሴ አልተመዘገበም። እድገትዎን ለመከታተል የመጀመሪያውን ትምህርት ይጀምሩ።' 
                  : 'No study activity yet. Start your first lesson or practice exam to begin tracking your academic progress.'}
              </span>
            </div>
            <button
              onClick={() => onNavigate('courses')}
              className="text-amber-400 hover:underline font-semibold shrink-0 cursor-pointer"
            >
              {isAmharic ? 'ኮርሶችን እይ' : 'Explore Courses'}
            </button>
          </div>
        )}
      </section>

      {/* ─── 4. CONTINUE LEARNING (High Priority Active Courses) ─── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isAmharic ? 'ጥናትዎን ይቀጥሉ' : 'Continue Learning'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAmharic ? 'በቅርብ ጊዜ ያጠኗቸው እና በእጅዎ ያሉ ኮርሶች' : 'Pick up exactly where you left off in your curriculum'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('courses')}
            className="text-xs text-amber-400 hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
          >
            <span>{isAmharic ? 'ሁሉንም ኮርሶች እይ' : 'All Courses'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {inProgressCourses.length === 0 ? (
          /* Proper, clean empty state */
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h4 className="text-sm font-bold text-white">
                {isAmharic ? 'የተጀመረ ኮርስ የለም' : 'Your courses will appear here'}
              </h4>
              <p className="text-xs text-slate-400">
                {isAmharic 
                  ? 'ከስርዓተ ትምህርቱ ውስጥ ኮርስ ሲጀምሩ የቀጣይነት እድገትዎ እዚህ ይታያል።' 
                  : 'Once you begin a lesson from the published curriculum, your progress and next topics will appear here.'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('courses')}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>{isAmharic ? 'ኮርሶችን ይጀምሩ' : 'Start Your First Course'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressCourses.slice(0, 4).map(({ course, progressPercentage, completedCount }) => {
              const isBookmarked = bookmarkedCourseIds.includes(course.id);
              return (
                <div
                  key={course.id}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {course.subject}
                      </span>
                      <button
                        onClick={(e) => handleToggleBookmark(course.id, e)}
                        className="text-slate-400 hover:text-amber-400 transition-colors p-1 cursor-pointer"
                        title="Bookmark course"
                      >
                        <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">{course.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {course.instructorName || 'EthioLearn Faculty'} • {course.lessonsCount || 6} Lessons
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Continue Action */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {completedCount} / {course.lessonsCount || 6} {isAmharic ? 'ክፍሎች ተጠናቀዋል' : 'lessons done'}
                        </span>
                        <span className="font-mono text-amber-400 font-bold">{progressPercentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-400">
                        {progressPercentage === 100 ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {isAmharic ? 'የተጠናቀቀ' : 'Completed'}
                          </span>
                        ) : (
                          <span>{isAmharic ? 'ቀጣይ ትምህርት ዝግጁ ነው' : 'Ready to continue'}</span>
                        )}
                      </span>

                      <button
                        onClick={() => {
                          playClickChime();
                          if (onSelectCourse) onSelectCourse(course.id);
                          else onNavigate('courses');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-semibold text-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>{isAmharic ? 'ቀጥል' : 'Continue'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 5. TWO-COLUMN: TODAY'S STUDY PLAN & AI TEACHER QUICK ACTIONS ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left Column: Today's Study Planner (Persisted in Supabase & Local DB) */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {isAmharic ? 'የእለት የጥናት እቅድ' : "Today's Study Plan"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Goal Hours Adjuster */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => handleUpdateTargetHours(-0.5)}
                    className="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                    title="Decrease daily target"
                  >
                    -
                  </button>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">{targetHours}h goal</span>
                  <button
                    onClick={() => handleUpdateTargetHours(0.5)}
                    className="text-slate-400 hover:text-white px-1 font-bold cursor-pointer"
                    title="Increase daily target"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => { playClickChime(); setShowAddTaskModal(true); }}
                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs cursor-pointer flex items-center gap-1"
                  title="Add custom study task"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold hidden sm:inline">{isAmharic ? 'አክል' : 'Add'}</span>
                </button>
              </div>
            </div>

            {/* Goal Progress Tracker */}
            <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {isAmharic ? 'የዛሬ የተጠና ሰዓት: ' : 'Daily Target Progress: '}
                  <strong className="text-white font-mono">{studyHoursCount}</strong> / {targetHours} hrs
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">{goalProgressPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${goalProgressPercentage}%` }}
                />
              </div>
            </div>

            {/* Tasks List */}
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                  <CheckSquare className="w-6 h-6 text-slate-600 mx-auto" />
                  <p>{isAmharic ? 'ምንም የጥናት እቅድ አልተመዘገበም።' : 'No tasks planned for today.'}</p>
                  <button
                    onClick={() => setShowAddTaskModal(true)}
                    className="text-amber-400 hover:underline font-semibold cursor-pointer text-xs"
                  >
                    + {isAmharic ? 'የመጀመሪያውን ተግባር ያክሉ' : 'Add your first study task'}
                  </button>
                </div>
              ) : (
                tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      task.isCompleted
                        ? 'bg-slate-950/40 border-slate-800/60 text-slate-400'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button className="shrink-0 text-amber-400">
                        {task.isCompleted ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <span className={`text-xs block truncate ${task.isCompleted ? 'line-through text-slate-400' : 'font-medium text-slate-100'}`}>
                          {task.title}
                        </span>
                        {task.subject && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {task.subject}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {task.duration || '20m'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="text-slate-600 hover:text-red-400 p-1 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              {completedTasksCount} of {tasks.length} tasks completed
            </span>
            <button
              onClick={() => onNavigate('quiz')}
              className="text-amber-400 hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <span>{isAmharic ? 'የልምምድ ፈተናዎች' : 'Practice Center'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: AI Teacher Section */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {isAmharic ? 'AI መምህርን ይጠይቁ' : 'Ask your AI Teacher'}
                  </h3>
                  <span className="text-[10px] text-slate-400 block">
                    {isAmharic ? 'ዛሬ ምን ማጥናት ይፈልጋሉ?' : 'What are you studying today?'}
                  </span>
                </div>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                Active
              </span>
            </div>

            {/* Quick Action Prompt Chips (Academic & Focused) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => handleOpenAIWithPrompt('explain')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group flex items-start gap-2.5"
              >
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors block">
                    {isAmharic ? 'ርዕስ አብራራልኝ' : 'Explain a Topic'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Break down complex theories in clear steps
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleOpenAIWithPrompt('quiz')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group flex items-start gap-2.5"
              >
                <BookCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors block">
                    {isAmharic ? 'የልምምድ ጥያቄዎች' : 'Generate Practice Qs'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Custom MCQs with detailed explanations
                  </span>
                </div>
              </button>

              <button
                onClick={() => {
                  playClickChime();
                  onNavigate('notes');
                }}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group flex items-start gap-2.5"
              >
                <FileText className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors block">
                    {isAmharic ? 'ማስታወሻ አጠቃልል' : 'Summarize Notes'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Generate high-yield revision cheat sheets
                  </span>
                </div>
              </button>

              <button
                onClick={() => handleOpenAIWithPrompt('difficult')}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-left transition-all cursor-pointer group flex items-start gap-2.5"
              >
                <BrainCircuit className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-xs font-bold text-slate-200 group-hover:text-purple-400 transition-colors block">
                    {isAmharic ? 'ከባድ ጥያቄ ፍታ' : 'Explain Difficult Problem'}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                    Step-by-step mathematical reasoning
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {mostRecentCourse ? `Context: ${mostRecentCourse.subject}` : 'General University Syllabus'}
            </span>

            <button
              onClick={() => onNavigate('tutor')}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <span>{isAmharic ? 'ክፈት' : 'Open AI Tutor'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 6. EXAM PREPARATION SECTION (Real Analytics & Model Exams) ─── */}
      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{isAmharic ? 'የፈተና ዝግጅት እና ውጤት' : 'Exam Preparation'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic ? 'የዩኒቨርሲቲ ሚድ እና ፋይናል ፈተናዎች እና የብሔራዊ ፈተና ልምምድ' : 'National exam blueprint models and verified university past papers'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('university')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
            >
              {isAmharic ? 'የዩኒቨርሲቲ ፈተናዎች' : 'University Hub'}
            </button>
            <button
              onClick={() => onNavigate('examprep')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
            >
              {isAmharic ? 'ብሔራዊ ፈተና' : 'National Exam'}
            </button>
          </div>
        </div>

        {/* Real Exam Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Card 1: Completed Exams & Mastery */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">
              {isAmharic ? 'የፈተና ውጤት አማካኝ' : 'Average Exam Score'}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">
                {averageExamScore !== null ? `${averageExamScore}%` : '--'}
              </span>
              <span className="text-xs text-slate-400">
                ({totalExamsCompleted} {isAmharic ? 'ፈተናዎች ተወስደዋል' : 'attempts'})
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {averageExamScore !== null && averageExamScore >= 70 
                ? (isAmharic ? 'ጥሩ ዝግጁነት ላይ ነዎት።' : 'Solid academic readiness.') 
                : (isAmharic ? 'ውጤትዎን ለማሻሻል ተጨማሪ ፈተናዎችን ይውሰዱ።' : 'Take model exams to benchmark your performance.')}
            </p>
          </div>

          {/* Card 2: Identified Weak Topics (Real data from attempts) */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <span className="text-xs text-slate-400 block font-medium">
              {isAmharic ? 'ትኩረት የሚሹ ርዕሶች' : 'Focus Areas / Weak Topics'}
            </span>
            {identifiedWeakTopics.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">
                {isAmharic ? 'እስካሁን ድክመቶች አልተለዩም። ፈተና ሲወስዱ እዚህ ይመደባሉ።' : 'No weak areas identified yet. They will appear after exam attempts.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {identifiedWeakTopics.map((topic, i) => (
                  <span 
                    key={i} 
                    className="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card 3: Model Exam Practice Action */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-2">
            <div>
              <span className="text-xs text-slate-400 block font-medium">
                {isAmharic ? 'የፈተና ሞተር' : 'Exam Engine'}
              </span>
              <p className="text-xs text-slate-300 mt-1">
                Timed mock exams with detailed answer keys and explanations.
              </p>
            </div>

            <button
              onClick={() => onNavigate('quiz')}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Play className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{isAmharic ? 'ልምምድ ጀምር' : 'Start Practice Quiz'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── 7. YOUR COURSES (Curriculum Track with Level Switcher) ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {isAmharic ? 'የእርስዎ ኮርሶች' : 'Your Courses'}
            </h2>
            <p className="text-xs text-slate-400">
              {isAmharic ? 'የሚኒስቴር እና የዩኒቨርሲቲ የትምህርት ሞጁሎች' : 'Official curriculum courses with structured chapters and lessons'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Level Switcher (Grade 12 / University) */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => { playClickChime(); onUpdateGrade('Grade 12'); }}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeLevel === 'Grade 12'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Grade 12
              </button>
              <button
                onClick={() => { playClickChime(); onUpdateGrade('University'); }}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeLevel === 'University'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                University
              </button>
            </div>

            <button
              onClick={() => onNavigate('courses')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-amber-500/40 transition-colors cursor-pointer"
            >
              {isAmharic ? 'ሁሉንም እይ' : 'View All'}
            </button>
          </div>
        </div>

        {/* Courses Responsive Grid */}
        {courses.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">
              {isAmharic ? 'ምንም የታተመ ኮርስ አልተገኘም' : `No courses published for ${activeLevel} yet.`}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isAmharic 
                ? 'አዳዲስ ኮርሶች ሲታተሙ እዚህ በራስ-ሰር ይታያሉ።' 
                : 'When new curriculum courses are approved and published by administrators, they will appear here.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.slice(0, 6).map(course => {
              const prog = progressMap[course.id];
              const pct = prog?.progressPercentage || 0;
              const isBookmarked = bookmarkedCourseIds.includes(course.id);

              return (
                <div
                  key={course.id}
                  onClick={() => {
                    playClickChime();
                    if (onSelectCourse) onSelectCourse(course.id);
                    else onNavigate('courses');
                  }}
                  className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {course.subject}
                      </span>
                      <button
                        onClick={(e) => handleToggleBookmark(course.id, e)}
                        className="text-slate-400 hover:text-amber-400 transition-colors p-1 cursor-pointer"
                      >
                        <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors leading-snug">
                        {course.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {course.description || 'Comprehensive curriculum module with lecture notes and practice exercises.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{course.instructorName || 'EthioLearn Faculty'}</span>
                      <span className="font-mono text-slate-300 font-medium">{course.lessonsCount || 6} Lessons</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-mono font-semibold text-amber-400">
                        {pct > 0 ? `${pct}% complete` : (isAmharic ? 'አልተጀመረም' : 'Not started')}
                      </span>
                      <span className="text-xs text-slate-400 group-hover:text-amber-400 font-medium inline-flex items-center gap-1 transition-colors">
                        <span>{isAmharic ? 'ጀምር' : 'Start'}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── 8. QUICK ACCESS WORKSPACE (Compact & Refined Cards) ─── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {isAmharic ? 'ፈጣን መዳረሻ ክፍሎች' : 'Quick Access'}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* AI Teacher */}
          <button
            onClick={() => { playClickChime(); onNavigate('tutor'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'AI መምህር' : 'AI Teacher'}
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Q&A & Explanations</span>
            </div>
          </button>

          {/* Study Notes */}
          <button
            onClick={() => { playClickChime(); onNavigate('notes'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-sky-400 transition-colors">
                {isAmharic ? 'የጥናት ማስታወሻ' : 'Study Notes'}
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Chapter Summaries</span>
            </div>
          </button>

          {/* Practice Quiz */}
          <button
            onClick={() => { playClickChime(); onNavigate('quiz'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                {isAmharic ? 'ልምምድ ፈተና' : 'Practice Quiz'}
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Interactive MCQs</span>
            </div>
          </button>

          {/* University Hub */}
          <button
            onClick={() => { playClickChime(); onNavigate('university'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'የዩኒቨርሲቲ ሃብ' : 'University Hub'}
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Past Mid & Finals</span>
            </div>
          </button>

          {/* National Exam */}
          <button
            onClick={() => { playClickChime(); onNavigate('examprep'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-purple-400 transition-colors">
                {isAmharic ? 'ብሔራዊ ፈተና' : 'National Exam'}
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Grade 12 Blueprint</span>
            </div>
          </button>

          {/* Book Store */}
          <button
            onClick={() => { playClickChime(); onNavigate('bookstore'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'መጻሕፍት ቤት' : 'Book Store'}
              </span>
              <span className="block text-[10px] text-slate-400 truncate">Digital Textbooks</span>
            </div>
          </button>
        </div>
      </section>

      {/* ─── MODAL: ADD STUDY TASK ─── */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{isAmharic ? 'አዲስ የጥናት ተግባር አክል' : 'Add Study Task'}</span>
              </h3>
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  {isAmharic ? 'የተግባሩ ርዕስ' : 'Task Title'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAmharic ? 'ምሳሌ፡ የቻፕተር 2 ሂሳብ ክለሳ' : 'e.g., Review Unit 3 Cloud Architecture'}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    {isAmharic ? 'የትምህርት አይነት' : 'Subject'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Emerging Tech"
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 font-medium mb-1">
                    {isAmharic ? 'የሚፈጀው ጊዜ' : 'Estimated Time'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 25m"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  {isAmharic ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {isAmharic ? 'አስቀምጥ' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: ANNOUNCEMENT DETAIL VIEW ─── */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-slate-100 space-y-3">
            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                {selectedAnnouncement.badgeText || 'Notice'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedAnnouncement.date}
              </span>
            </div>

            <h3 className="text-base font-bold text-white">
              {selectedAnnouncement.title}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {selectedAnnouncement.message}
            </p>

            <button
              onClick={() => setSelectedAnnouncement(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs text-slate-200 font-semibold transition-colors cursor-pointer"
            >
              {isAmharic ? 'እሺ፣ ተረድቻለሁ' : 'Dismiss Announcement'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
