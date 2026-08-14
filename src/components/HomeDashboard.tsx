import React, { useState, useEffect } from 'react';
import { 
  Bot, BookOpen, Play, GraduationCap, FileText, Bell, Star, Clock, CheckCircle, Flame, Calendar,
  Target, CheckSquare, Square, TrendingUp, ArrowRight, ShieldCheck, X, ChevronRight, Bookmark, Award
} from 'lucide-react';
import { StudentProfile, CourseRecord, PlatformAnnouncement } from '../types';
import { playClickChime, playSuccessChime } from '../utils/audio';
import { safeStorage } from '../utils/safeStorage';
import { getEthiopianDate, toGeezNumeral, ETHIOPIAN_HOLIDAYS } from '../utils/ethiopianCalendar';
import { fetchPublishedCourses, fetchAnnouncements } from '../utils/supabaseCourses';

interface HomeDashboardProps {
  profile: StudentProfile;
  language: 'en' | 'am' | 'both';
  onNavigate: (page: 'home' | 'tutor' | 'quiz' | 'profile' | 'notes' | 'examprep' | 'bookstore' | 'university') => void;
  onUpdateGrade: (grade: string) => void;
  streakCount: number;
  studyHoursCount: number;
}

interface DailyTask {
  id: string;
  titleEn: string;
  titleAm: string;
  subject: string;
  duration: string;
  completed: boolean;
}

interface NotificationItem {
  id: string;
  titleEn: string;
  titleAm: string;
  descEn: string;
  descAm: string;
  timeEn: string;
  timeAm: string;
  read: boolean;
}

export default function HomeDashboard({
  profile,
  language,
  onNavigate,
  onUpdateGrade,
  streakCount,
  studyHoursCount
}: HomeDashboardProps) {
  const isAmharic = language === 'am';

  // Live Ethiopian Ge'ez Calendar Calculation
  const ethDate = getEthiopianDate(new Date());
  const geezDayNumeral = toGeezNumeral(ethDate.day);

  // Check for today's Ethiopian holiday if any
  const todayHoliday = ETHIOPIAN_HOLIDAYS.find(
    h => h.day === ethDate.day && h.monthIndex === ethDate.monthIndex
  );

  // Load last active subject
  const lastActiveSubject = safeStorage.getItem('ethiolearn_last_subject') || (profile.subjects && profile.subjects[0]) || "Emerging Technologies";

  // Bookmarks
  const [favoritedCourses, setFavoritedCourses] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem('ethiolearn_bookmarked_courses');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Daily Tasks Checklist
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(() => {
    try {
      const saved = safeStorage.getItem('ethiolearn_daily_tasks_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [
      { id: 't1', titleEn: 'Unit 2 Logic & Critical Reasoning Quiz', titleAm: 'የምዕራፍ 2 የሎጂክ እና ክሪቲካል ቲንኪንግ ፈተና', subject: 'Logic', duration: '20m', completed: true },
      { id: 't2', titleEn: 'Emerging Tech Cloud Architecture Notes', titleAm: 'የኤመርጂንግ ቴክኖሎጂስ ማስታወሻ መከለስ', subject: 'Emerging Tech', duration: '15m', completed: false },
      { id: 't3', titleEn: '10 National Exam Mathematics Practice Problems', titleAm: '10 የብሔራዊ ፈተና የሂሳብ ጥያቄዎች', subject: 'Math', duration: '25m', completed: false },
    ];
  });

  const toggleTask = (taskId: string) => {
    playSuccessChime();
    setDailyTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
      safeStorage.setItem('ethiolearn_daily_tasks_v2', JSON.stringify(updated));
      return updated;
    });
  };

  // Target Goal State
  const [targetHours, setTargetHours] = useState<number>(() => {
    const saved = safeStorage.getItem('ethiolearn_target_hours');
    return saved ? parseFloat(saved) : 3.0;
  });

  const updateTargetHours = (delta: number) => {
    playClickChime();
    setTargetHours(prev => {
      const next = Math.max(1, Math.min(8, +(prev + delta).toFixed(1)));
      safeStorage.setItem('ethiolearn_target_hours', next.toString());
      return next;
    });
  };

  // Notification Drawer State
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      titleEn: 'Freshman Emerging Tech Practice Module',
      titleAm: 'አዲስ የኤመርጂንግ ቴክኖሎጂስ የፈተና ሞጁል',
      descEn: '45 new practice questions added for Unit 3 (Cloud & IoT) in the University Hub.',
      descAm: 'በዩኒቨርሲቲ ሃብ ውስጥ ለምዕራፍ 3 45 አዳዲስ የልምምድ ጥያቄዎች ተጨምረዋል።',
      timeEn: '10m ago',
      timeAm: 'ከ10ደቂቃ በፊት',
      read: false
    },
    {
      id: '2',
      titleEn: 'Grade 12 National Exam Blueprint Update',
      titleAm: 'የክፍል 12 ብሔራዊ ፈተና መመሪያ',
      descEn: 'Mathematics and Physics model exams updated per Ministry guidelines.',
      descAm: 'የሂሳብና ፊዚክስ ሞዴል ፈተናዎች በትምህርት ሚኒስቴር መመሪያ መሠረት ዘምነዋል።',
      timeEn: 'Yesterday',
      timeAm: 'ትናንት',
      read: true
    }
  ]);

  // Real Database Courses from Supabase (Single Source of Truth)
  const activeLevel = profile.year === 'University' ? 'University' : 'Grade 12';
  const [publishedCourses, setPublishedCourses] = useState<CourseRecord[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingCourses(true);
    fetchPublishedCourses(activeLevel)
      .then(courses => {
        if (isMounted) {
          setPublishedCourses(courses);
          setLoadingCourses(false);
        }
      })
      .catch(err => {
        console.error('Failed to load published courses:', err);
        if (isMounted) setLoadingCourses(false);
      });

    // Also fetch live announcements from database
    fetchAnnouncements(true).then(dbAnnouncements => {
      if (isMounted && dbAnnouncements.length > 0) {
        const mapped: NotificationItem[] = dbAnnouncements.map(a => ({
          id: a.id,
          titleEn: a.title,
          titleAm: a.title,
          descEn: a.message,
          descAm: a.message,
          timeEn: a.date,
          timeAm: a.date,
          read: false
        }));
        setNotifications(prev => {
          // Merge without duplicating existing IDs
          const existingIds = new Set(prev.map(p => p.id));
          const newOnes = mapped.filter(m => !existingIds.has(m.id));
          return [...newOnes, ...prev];
        });
      }
    });

    return () => { isMounted = false; };
  }, [activeLevel]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleCourseFavorite = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playClickChime();
    setFavoritedCourses(prev => {
      const updated = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
      safeStorage.setItem('ethiolearn_bookmarked_courses', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllNotificationsAsRead = () => {
    playSuccessChime();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const completedTasksCount = dailyTasks.filter(t => t.completed).length;
  const progressPercent = Math.min(100, Math.round((studyHoursCount / targetHours) * 100));

  return (
    <div id="etlearn-dashboard-root" className="w-full space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* ─── 1. TOP SUB-BAR (Notifications & Quick Holiday Notice) ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {todayHoliday && (
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {isAmharic ? `መልካም ${todayHoliday.nameAm}!` : `Happy ${todayHoliday.nameEn}!`}
            </span>
          )}
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => { playClickChime(); setShowNotifications(!showNotifications); }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {isAmharic ? 'ማስታወቂያዎች' : 'Platform Announcements'}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    {isAmharic ? 'ሁሉንም አንብብ' : 'Mark all read'}
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { setSelectedNotification(n); setShowNotifications(false); }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      n.read ? 'bg-slate-900/40 border-slate-800/60 text-slate-400' : 'bg-slate-900 border-amber-500/30 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] text-amber-400">{isAmharic ? n.titleAm : n.titleEn}</span>
                      <span className="text-[9px] text-slate-500">{isAmharic ? n.timeAm : n.timeEn}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{isAmharic ? n.descAm : n.descEn}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. HERO GREETING & STUDY GOAL ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Welcome Card */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#0A1128] border border-slate-800/80 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono uppercase font-bold">
                {profile.university || 'Wolkite University'} • {profile.year || 'Freshman'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {ethDate.monthName} {ethDate.day} ({geezDayNumeral}), {ethDate.year} ዓ.ም.
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isAmharic ? `እንኳን ደህና መጣህ፣ ${profile.name}!` : `Welcome back, ${profile.name}!`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
              {isAmharic 
                ? 'የዛሬውን የጥናት እቅድዎን ይቀጥሉ፤ አስጎብኚ AI ለእርስዎ ጥያቄዎች ዝግጁ ነው።' 
                : 'Accelerate your coursework mastery. Asgobnyi AI and exam models are synced to your syllabus.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={() => { playClickChime(); onNavigate('tutor'); }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10"
            >
              <Bot className="w-4 h-4" />
              <span>{isAmharic ? 'አስጎብኚን ጠይቅ' : 'Ask Asgobnyi AI'}</span>
            </button>
            <button
              onClick={() => { playClickChime(); onNavigate('quiz'); }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAmharic ? 'ፈተና ጀምር' : 'Start Practice Quiz'}</span>
            </button>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>{isAmharic ? 'የእለት ጥናት ግብ' : 'Daily Goal'}</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => updateTargetHours(-0.5)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
                >
                  -
                </button>
                <span className="text-[11px] font-mono text-amber-400 font-bold">{targetHours}h</span>
                <button
                  onClick={() => updateTargetHours(0.5)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-1 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Goal Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  {studyHoursCount} <span className="text-xs font-normal text-slate-400">/ {targetHours} hrs</span>
                </span>
                <span className="text-xs font-mono text-amber-400 font-semibold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              <span className="font-medium text-slate-200">{streakCount} {isAmharic ? 'ቀናት ቀጣይነት' : 'day streak'}</span>
            </div>
            <button
              onClick={() => { playClickChime(); onNavigate('profile'); }}
              className="text-amber-400 hover:underline text-[11px] font-medium cursor-pointer"
            >
              {isAmharic ? 'ስታቲስቲክስ' : 'View Stats'}
            </button>
          </div>
        </div>
      </section>

      {/* ─── 3. STUDY WORKSPACE GRID (Consistent Quiet Cards) ─── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {isAmharic ? 'የጥናት ክፍሎች' : 'Workspace Tools'}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* AI Tutor */}
          <button
            onClick={() => { playClickChime(); onNavigate('tutor'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <Bot className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'አስጎብኚ AI' : 'AI Tutor'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Q&A Assistant</span>
            </div>
          </button>

          {/* Exam Prep Notes */}
          <button
            onClick={() => { playClickChime(); onNavigate('notes'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <FileText className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'የጥናት ማስታወሻ' : 'Study Notes'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Course Summaries</span>
            </div>
          </button>

          {/* Practice Quiz */}
          <button
            onClick={() => { playClickChime(); onNavigate('quiz'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <Play className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'ልምምድ ፈተና' : 'Practice Quiz'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Interactive tests</span>
            </div>
          </button>

          {/* University Exams */}
          <button
            onClick={() => { playClickChime(); onNavigate('university'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <GraduationCap className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'የዩኒቨርሲቲ ሃብ' : 'University Hub'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Past mid & finals</span>
            </div>
          </button>

          {/* National Exam Prep */}
          <button
            onClick={() => { playClickChime(); onNavigate('examprep'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <Award className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'ብሔራዊ ፈተና' : 'National Exam'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Grade 12 blueprint</span>
            </div>
          </button>

          {/* Digital Bookstore */}
          <button
            onClick={() => { playClickChime(); onNavigate('bookstore'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <BookOpen className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'መጻሕፍት ቤት' : 'Book Store'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Digital textbooks</span>
            </div>
          </button>
        </div>
      </section>

      {/* ─── 4. DAILY TASKS & LIVE CURRICULUM TRACK ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Tasks Checklist */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isAmharic ? 'የእለት የጥናት ተግባራት' : 'Daily Study Checklist'}
              </h3>
              <span className="text-[11px] font-mono text-amber-400 font-semibold">
                {completedTasksCount} / {dailyTasks.length} {isAmharic ? 'ተጠናቋል' : 'done'}
              </span>
            </div>

            <div className="space-y-2">
              {dailyTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    task.completed
                      ? 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                      : 'bg-slate-900 border-slate-800 hover:border-amber-500/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button className="shrink-0 text-amber-400">
                      {task.completed ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                    </button>
                    <span className={`text-xs ${task.completed ? 'line-through text-slate-500' : 'font-medium'}`}>
                      {isAmharic ? task.titleAm : task.titleEn}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{task.duration}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-right">
            <button
              onClick={() => { playClickChime(); onNavigate('quiz'); }}
              className="text-xs text-amber-400 hover:underline transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              <span>{isAmharic ? 'የፈተና ማዕከል' : 'Practice Center'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Published Curriculum Track (from Supabase Database) */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isAmharic ? 'የኮርስ ሞጁሎች' : 'Curriculum Track'}
              </h3>
              
              {/* Program Switcher */}
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => { playClickChime(); onUpdateGrade('Grade 12'); }}
                  className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    activeLevel === 'Grade 12' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Grade 12
                </button>
                <button
                  onClick={() => { playClickChime(); onUpdateGrade('University'); }}
                  className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    activeLevel === 'University' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  University
                </button>
              </div>
            </div>

            {loadingCourses ? (
              <div className="space-y-2 py-4">
                <div className="h-14 bg-slate-950/60 animate-pulse rounded-xl border border-slate-800" />
                <div className="h-14 bg-slate-950/60 animate-pulse rounded-xl border border-slate-800" />
              </div>
            ) : publishedCourses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                <BookOpen className="w-6 h-6 text-slate-600 mx-auto" />
                <p>No published courses available for {activeLevel} yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {publishedCourses.slice(0, 3).map((course) => {
                  const isBookmarked = favoritedCourses.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      onClick={() => { playClickChime(); onNavigate('bookstore'); }}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 block mb-0.5">{course.subject}</span>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">{course.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{course.description || 'Comprehensive curriculum module with practice questions.'}</p>
                      </div>

                      <button
                        onClick={(e) => toggleCourseFavorite(course.id, e)}
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1 cursor-pointer"
                      >
                        <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-right">
            <button
              onClick={() => { playClickChime(); onNavigate('bookstore'); }}
              className="text-xs text-amber-400 hover:underline transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              <span>{isAmharic ? 'ሁሉንም ኮርሶች እይ' : 'Explore All Courses'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Detail Modal Pop-up for Notifications */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-slate-100">
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[10px] font-mono text-slate-400 block mb-1">
              {isAmharic ? selectedNotification.timeAm : selectedNotification.timeEn}
            </span>
            <h3 className="text-sm font-semibold text-white mb-2">
              {isAmharic ? selectedNotification.titleAm : selectedNotification.titleEn}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isAmharic ? selectedNotification.descAm : selectedNotification.descEn}
            </p>

            <button
              onClick={() => setSelectedNotification(null)}
              className="mt-5 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors cursor-pointer"
            >
              {isAmharic ? 'እሺ' : 'Close Notice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
