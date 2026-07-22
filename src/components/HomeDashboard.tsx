import React, { useState } from 'react';
import { 
  Bot, BookOpen, Play, GraduationCap, FileText, Bell, Star, Clock, CheckCircle, Flame, Calendar,
  Target, CheckSquare, Square, TrendingUp, Zap, ArrowRight, ShieldCheck, Sparkles, X, Check, Award
} from 'lucide-react';
import { StudentProfile } from '../types';
import { playClickChime, playSuccessChime } from '../utils/audio';
import { safeStorage } from '../utils/safeStorage';
import { getEthiopianDate, toGeezNumeral, ETHIOPIAN_HOLIDAYS } from '../utils/ethiopianCalendar';

interface HomeDashboardProps {
  profile: StudentProfile;
  language: 'en' | 'am' | 'both';
  onNavigate: (page: 'home' | 'tutor' | 'quiz' | 'profile' | 'notes' | 'examprep' | 'bookstore' | 'university') => void;
  onUpdateGrade: (grade: string) => void;
  streakCount: number;
  studyHoursCount: number;
}

interface RecommendedCourse {
  id: string;
  title: string;
  description: string;
  level: 'Grade 12' | 'University';
  lessonsCount: number;
  goalDays: number;
  subject: string;
  badge?: string;
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
  category: 'exam' | 'calendar' | 'system' | 'badge';
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
  
  // Ge'ez date formatted string
  const geezDateDisplay = isAmharic 
    ? `${ethDate.monthName} ${ethDate.day} (${geezDayNumeral}) ቀን ${ethDate.year} (፪ሺ፲፰) ዓ.ም.`
    : `${ethDate.monthName} ${ethDate.day} (${geezDayNumeral}), ${ethDate.year} EC`;

  // Check for today's Ethiopian holiday if any
  const todayHoliday = ETHIOPIAN_HOLIDAYS.find(
    h => h.day === ethDate.day && h.monthIndex === ethDate.monthIndex
  );

  // Dynamic status/level calculator (based on activity)
  const getProgressLevel = () => {
    if (streakCount >= 15 || studyHoursCount >= 30) {
      return {
        en: 'Elite Scholar',
        am: 'ልሂቅ ተማሪ',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        badgeIcon: '🏆'
      };
    } else if (streakCount >= 7 || studyHoursCount >= 15) {
      return {
        en: 'Advanced Scholar',
        am: 'ከፍተኛ ደረጃ ተማሪ',
        badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        badgeIcon: '🎖️'
      };
    } else if (streakCount >= 3 || studyHoursCount >= 5) {
      return {
        en: 'Active Scholar',
        am: 'ንቁ ተማሪ',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        badgeIcon: '⭐'
      };
    } else {
      return {
        en: 'Emerging Scholar',
        am: 'ጀማሪ ተማሪ',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        badgeIcon: '🎓'
      };
    }
  };

  const levelInfo = getProgressLevel();

  // Load last active subject
  const lastActiveSubject = safeStorage.getItem('ethiolearn_last_subject') || (profile.subjects && profile.subjects[0]) || "Emerging Technologies";
  const lastScore = safeStorage.getItem('ethiolearn_last_quiz_score');

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
      { id: 't1', titleEn: 'Complete Unit 2 Logic & Critical Reasoning Quiz', titleAm: 'የምዕራፍ 2 የሎጂክ እና ክሪቲካል ቲንኪንግ ፈተና ማጠናቀቅ', subject: 'Logic', duration: '20 mins', completed: true },
      { id: 't2', titleEn: 'Review Emerging Tech Cloud Architecture Notes', titleAm: 'የኤመርጂንግ ቴክኖሎጂስ ክላውድ አርክቴክቸር ማስታወሻ መከለስ', subject: 'Emerging Tech', duration: '15 mins', completed: false },
      { id: 't3', titleEn: 'Practice 10 National Exam Math Questions', titleAm: '10 የብሔራዊ ፈተና የሂሳብ ጥያቄዎችን መለማመድ', subject: 'Math', duration: '25 mins', completed: false },
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

  // 🔔 ACTIVE NOTIFICATION CENTER STATE
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      titleEn: 'Freshman Emerging Tech Exam Added!',
      titleAm: 'አዲስ የኤመርጂንግ ቴክኖሎጂስ የፈተና ሞጁል ተጨምሯል!',
      descEn: '45 new practice questions for Unit 3 (Cloud & IoT Architectures) added to the University Hub.',
      descAm: 'በዩኒቨርሲቲ ሃብ ውስጥ ለምዕራፍ 3 45 አዳዲስ የልምምድ ጥያቄዎች ተዘጋጅተዋል።',
      timeEn: '10 mins ago',
      timeAm: 'ከ10 ደቂቃ በፊት',
      category: 'exam',
      read: false
    },
    {
      id: '2',
      titleEn: `Ge'ez Date Today: ${geezDateDisplay}`,
      titleAm: `የዛሬው የግዕዝ ቀን፡ ${geezDateDisplay}`,
      descEn: `Academic calendar is set to ${ethDate.monthName} ${ethDate.day} (${geezDayNumeral}), ${ethDate.year} EC. Check upcoming study deadlines!`,
      descAm: `የትምህርት ካሌንደሩ በ${ethDate.monthName} ${ethDate.day} ተስተካክሏል። የጥናት ቀጠሮዎችዎን ይከታተሉ!`,
      timeEn: 'Today',
      timeAm: 'ዛሬ',
      category: 'calendar',
      read: false
    },
    {
      id: '3',
      titleEn: 'Grade 12 National Exam Blueprint Updated',
      titleAm: 'የክፍል 12 ብሔራዊ ፈተና መመሪያ ዘምኗል',
      descEn: 'Mathematics, Physics, and English model exams are updated according to Ministry of Education guidelines.',
      descAm: 'የሂሳብ፥ ፊዚክስ እና እንግሊዝኛ ሞዴል ፈተናዎች በትምህርት ሚኒስቴር መመሪያ መሠረት ዘምነዋል።',
      timeEn: 'Yesterday',
      timeAm: 'ትናንት',
      category: 'system',
      read: true
    }
  ]);

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

  const markSingleAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Recommended course catalog based on student level
  const RECOMMENDED_COURSES: RecommendedCourse[] = [
    {
      id: 'emerging_tech_uni',
      title: 'Emerging Technologies & Modern Systems',
      description: 'Comprehensive guide covering Cloud, AI foundations, Blockchain, Big Data, and IoT application architectures.',
      level: 'University',
      lessonsCount: 18,
      goalDays: 25,
      subject: 'Emerging Tech',
      badge: 'Core Module'
    },
    {
      id: 'logic_critical_uni',
      title: 'Rigorous Logic & Critical Reasoning',
      description: 'Sharpen analytical reasoning, detect fallacies, and analyze logical statements with interactive exercises.',
      level: 'University',
      lessonsCount: 15,
      goalDays: 22,
      subject: 'Logic & Reasoning',
      badge: 'Required'
    },
    {
      id: 'moral_civic_uni',
      title: 'Moral & Civic Education Foundations',
      description: 'Explore ethics, state institutions, citizenship laws, and constitutional governance in Ethiopia and beyond.',
      level: 'University',
      lessonsCount: 10,
      goalDays: 18,
      subject: 'Civics & Ethics',
      badge: 'Foundational'
    },
    {
      id: 'math_prep_12',
      title: 'Mathematics National Exam Blueprint',
      description: 'Master calculus, integration, sequences, and logic equations designed specifically for Grade 12 entrants.',
      level: 'Grade 12',
      lessonsCount: 16,
      goalDays: 30,
      subject: 'Mathematics',
      badge: 'National Exam'
    },
    {
      id: 'econ_intro_12',
      title: 'Principles of Economics (Grade 12)',
      description: 'Demystifying supply, demand, market structure, macroeconomics, and local economic metrics.',
      level: 'Grade 12',
      lessonsCount: 12,
      goalDays: 20,
      subject: 'Economics',
      badge: 'Popular'
    },
    {
      id: 'eng_comm_12',
      title: 'Communicative English Mastery',
      description: 'Essential sentence correction guides, listening comprehension drills, and vocabulary builders.',
      level: 'Grade 12',
      lessonsCount: 14,
      goalDays: 15,
      subject: 'English',
      badge: 'Essential'
    }
  ];

  const activeLevel = profile.year === 'University' ? 'University' : 'Grade 12';
  const filteredCourses = RECOMMENDED_COURSES.filter(c => c.level === activeLevel);
  const completedTasksCount = dailyTasks.filter(t => t.completed).length;
  const progressPercent = Math.min(100, Math.round((studyHoursCount / targetHours) * 100));

  return (
    <div id="etlearn-dashboard-root" className="min-h-screen bg-[#070e20] text-slate-100 p-4 sm:p-6 lg:p-8 rounded-3xl border border-[#1a2952] shadow-2xl flex flex-col font-sans relative overflow-hidden">
      
      {/* Top Ethiopian Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 z-30" />

      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute bottom-10 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none select-none" />

      {/* ─── 1. ACTIVE NOTIFICATION BANNER (Always Visible to Students) ─── */}
      <div className="relative z-20 mb-5 bg-[#0e1838] border border-[#1e3063] rounded-2xl p-3 px-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                {isAmharic ? 'ቀጥታ ማስታወቂያ' : 'Active Announcement'}
              </span>
            </div>
            <p className="text-xs text-slate-200 font-medium mt-0.5">
              {isAmharic 
                ? 'አዳዲስ የፈተና ጥያቄዎችና ሞጁሎች በሃብ ውስጥ ተጨምረዋል።' 
                : 'New practice exams and study blueprints uploaded.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => { playClickChime(); setShowNotifications(true); }}
          className="self-end sm:self-auto px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <span>{isAmharic ? 'ሁሉንም ማስታወቂያዎች እይ' : 'View All Alerts'}</span>
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── 2. HEADER BAR (Real customized Ethiopian Student Portal look) ─── */}
      <header className="pb-6 mb-6 border-b border-[#18264d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-20">
        
        {/* Brand Identity & Aksumawi Team Tag */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-amber-500 to-indigo-600 p-0.5 shadow-lg flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#0b142d] rounded-[14px] flex items-center justify-center font-black text-amber-400 text-2xl tracking-tight">
              E
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-2xl tracking-tight text-white">
                EthioLearn Pro
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase tracking-widest">
                Student Portal
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAmharic ? 'ዲጂታል የትምህርት ማዕከል' : 'Digital Learning Hub'}</span>
            </p>
          </div>
        </div>

        {/* Real Ge'ez Calendar Widget & Interactive Notifications */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Live Ge'ez Calendar Card */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0f1b3b] border border-[#1e3061] shadow-inner text-xs">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-left">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-400/80 leading-none">
                {isAmharic ? 'የግዕዝ ቀን መቁጠሪያ' : "Ge'ez Calendar"}
              </span>
              <span className="text-xs font-mono font-bold text-slate-100">
                {ethDate.monthName} <span className="text-amber-400 font-extrabold">{ethDate.day}</span> <span className="text-slate-400">({geezDayNumeral})</span>, {ethDate.year} EC
              </span>
            </div>
          </div>

          {/* Active Notifications Bell Trigger */}
          <div className="relative">
            <button
              onClick={() => { playClickChime(); setShowNotifications(!showNotifications); }}
              className="w-11 h-11 rounded-2xl bg-[#0f1b3b] hover:bg-[#162754] border border-[#1e3061] flex items-center justify-center text-slate-200 hover:text-white transition-all cursor-pointer relative shadow-md"
              title={isAmharic ? 'ማስታወቂያዎች' : 'Notifications'}
            >
              <Bell className="w-5 h-5 text-amber-400" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1b3b] animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f1b3b]" />
              )}
            </button>

            {/* Active Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#0d1633] border border-[#1f3266] rounded-2xl shadow-2xl p-4 z-50 text-xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1f3266]">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    {isAmharic ? 'ማስታወቂያዎች' : 'Notifications & Alerts'}
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                        {unreadCount} unread
                      </span>
                    )}
                  </span>
                  <button 
                    onClick={markAllNotificationsAsRead}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {isAmharic ? 'ሁሉንም አንብቤያለሁ' : 'Mark all read'}
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => { markSingleAsRead(n.id); setSelectedNotification(n); }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        n.read 
                          ? 'bg-[#091026] border-[#18264e] text-slate-400 hover:bg-[#0d1738]' 
                          : 'bg-[#122047] border-amber-500/40 text-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-100 text-xs line-clamp-1">
                          {isAmharic ? n.titleAm : n.titleEn}
                        </span>
                        <span className="text-[9px] font-mono text-amber-400 shrink-0">
                          {isAmharic ? n.timeAm : n.timeEn}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                        {isAmharic ? n.descAm : n.descEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Holiday Alert Pill if active today */}
      {todayHoliday && (
        <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-blue-500/20 border border-amber-500/40 flex items-center justify-between text-xs text-amber-200 shadow-md relative z-20">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span className="font-bold text-amber-100">
              {isAmharic ? `መልካም ${todayHoliday.nameAm}!` : `Happy ${todayHoliday.nameEn}!`}
            </span>
          </div>
          <span className="text-[11px] font-mono font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
            {ethDate.formatted}
          </span>
        </div>
      )}

      {/* ─── 3. PRIMARY STUDENT DASHBOARD HERO ─── */}
      <section className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-20">
        
        {/* Welcome & Scholar Rank */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#0f1b3b] via-[#12224d] to-[#0d1736] border border-[#1f3266] p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${levelInfo.badgeBg}`}>
                <span>{levelInfo.badgeIcon}</span>
                <span>{isAmharic ? levelInfo.am : levelInfo.en}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight leading-snug">
              {isAmharic ? `ሰላም፥ ${profile.name || 'ተማሪ'}!` : `Welcome back, ${profile.name || 'Student'}!`} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-xl font-sans">
              {isAmharic 
                ? `ዛሬ ${geezDateDisplay} ነው። የትምህርት ግቦችዎን ለማሳካት ተጨማሪ እርምጃ እንውሰድ!`
                : `Today is ${geezDateDisplay}. Every study session builds lasting academic mastery.`}
            </p>
          </div>

          {/* Metric Badges */}
          <div className="mt-6 pt-5 border-t border-[#1e3061] grid grid-cols-3 gap-3">
            {/* Streak */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-orange-400 fill-orange-400/20" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {isAmharic ? 'ቀጣይነት' : 'Streak'}
                </span>
                <span className="text-sm font-mono font-black text-white">
                  {streakCount} {isAmharic ? 'ቀን' : 'Days'}
                </span>
              </div>
            </div>

            {/* Study Hours */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {isAmharic ? 'የተጠና' : 'Studied'}
                </span>
                <span className="text-sm font-mono font-black text-white">
                  {studyHoursCount} {isAmharic ? 'ሰዓት' : 'Hours'}
                </span>
              </div>
            </div>

            {/* Active Subjects */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {isAmharic ? 'ትምህርቶች' : 'Subjects'}
                </span>
                <span className="text-sm font-mono font-black text-white">
                  {profile.subjects ? profile.subjects.length : 22}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Daily Target Goal Progress Card */}
        <div className="bg-[#0f1b3b] border border-[#1f3266] p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {isAmharic ? 'የዕለቱ የጥናት ግብ' : 'Daily Goal Target'}
                </span>
              </div>
              {/* Plus/minus buttons */}
              <div className="flex items-center gap-1 bg-[#081026] px-2 py-0.5 rounded-lg border border-[#1b2a52]">
                <button 
                  onClick={() => updateTargetHours(-0.5)} 
                  className="text-xs font-bold text-slate-400 hover:text-white px-1 cursor-pointer"
                  title="Decrease goal"
                >-</button>
                <span className="text-xs font-bold font-mono text-amber-400">{targetHours}h</span>
                <button 
                  onClick={() => updateTargetHours(0.5)} 
                  className="text-xs font-bold text-slate-400 hover:text-white px-1 cursor-pointer"
                  title="Increase goal"
                >+</button>
              </div>
            </div>

            <div className="my-4 space-y-2">
              <div className="flex items-end justify-between">
                <span className="text-2xl font-mono font-black text-white">
                  {studyHoursCount} <span className="text-xs font-normal text-slate-400">/ {targetHours} hrs</span>
                </span>
                <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                  {progressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-[#070d21] rounded-full overflow-hidden border border-[#1b2a52] p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {progressPercent >= 100 
              ? (isAmharic ? '🎉 ድንቅ ነው! የዛሬውን የጥናት ግብዎን አጠናቀዋል!' : '🎉 Outstanding! You reached today’s study goal!')
              : (isAmharic ? `ለግብዎ ${+(targetHours - studyHoursCount).toFixed(1)} ሰዓት ይቀራል` : `${+(targetHours - studyHoursCount).toFixed(1)} hrs left to hit today’s target`)}
          </p>
        </div>
      </section>

      {/* ─── 4. CORE NAVIGATION TOOLS (Custom High-Impact Cards) ─── */}
      <section className="mb-6 relative z-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            {isAmharic ? 'የጥናት መሣሪያዎች' : 'Core Learning Tools'}
          </h2>
          <span className="text-[10px] text-amber-400 font-mono">
            {isAmharic ? 'የትምህርት ክፍሎች' : 'Study Modules'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. AI Tutor */}
          <button
            onClick={() => { playClickChime(); onNavigate('tutor'); }}
            className="p-4 rounded-2xl bg-[#0f1b3b] border border-[#1f3266] hover:border-blue-500/60 hover:bg-[#152550] transition-all cursor-pointer text-left group flex flex-col justify-between h-36 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                {isAmharic ? 'አይ መምህር' : 'AI Tutor'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {isAmharic ? 'ፈጣን መልሶች' : 'Instant answers'}
              </span>
            </div>
          </button>

          {/* 2. Exam Prep & Notes */}
          <button
            onClick={() => { playClickChime(); onNavigate('notes'); }}
            className="p-4 rounded-2xl bg-[#0f1b3b] border border-[#1f3266] hover:border-emerald-500/60 hover:bg-[#152550] transition-all cursor-pointer text-left group flex flex-col justify-between h-36 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                {isAmharic ? 'ፈተና ዝግጅት' : 'Exam Notes'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {isAmharic ? 'ማጠቃለያዎች' : 'Study guides'}
              </span>
            </div>
          </button>

          {/* 3. Practice Quiz */}
          <button
            onClick={() => { playClickChime(); onNavigate('quiz'); }}
            className="p-4 rounded-2xl bg-[#0f1b3b] border border-[#1f3266] hover:border-amber-500/60 hover:bg-[#152550] transition-all cursor-pointer text-left group flex flex-col justify-between h-36 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'ልምምድ ፈተና' : 'Practice Quiz'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {isAmharic ? 'እውቀት መዘን' : 'Test knowledge'}
              </span>
            </div>
          </button>

          {/* 4. University / Grade 12 Hub */}
          <button
            onClick={() => { playClickChime(); onNavigate(activeLevel === 'University' ? 'university' : 'examprep'); }}
            className="p-4 rounded-2xl bg-[#0f1b3b] border border-[#1f3266] hover:border-purple-500/60 hover:bg-[#152550] transition-all cursor-pointer text-left group flex flex-col justify-between h-36 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                {activeLevel === 'University' ? (isAmharic ? 'ዩኒቨርሲቲ ሃብ' : 'Freshman Hub') : (isAmharic ? 'ብሔራዊ ፈተና' : 'National Exam')}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {activeLevel === 'University' ? (isAmharic ? 'ኮርሶችና ሞጁሎች' : 'Courses') : (isAmharic ? 'የፈተና ሞጁሎች' : 'Blueprints')}
              </span>
            </div>
          </button>

          {/* 5. Bookstore & Textbooks */}
          <button
            onClick={() => { playClickChime(); onNavigate('bookstore'); }}
            className="p-4 rounded-2xl bg-[#0f1b3b] border border-[#1f3266] hover:border-rose-500/60 hover:bg-[#152550] transition-all cursor-pointer text-left group flex flex-col justify-between h-36 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-white group-hover:text-rose-400 transition-colors">
                {isAmharic ? 'መጻሕፍት' : 'Textbooks'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {isAmharic ? 'ዲጂታል መጻሕፍት' : 'Read PDFs'}
              </span>
            </div>
          </button>

          {/* 6. Performance Analytics */}
          <button
            onClick={() => { playClickChime(); onNavigate('profile'); }}
            className="p-4 rounded-2xl bg-[#0f1b3b] border border-[#1f3266] hover:border-teal-500/60 hover:bg-[#152550] transition-all cursor-pointer text-left group flex flex-col justify-between h-36 shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-white group-hover:text-teal-400 transition-colors">
                {isAmharic ? 'የእድገት መረጃ' : 'Analytics'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {isAmharic ? 'የውጤት ትንተና' : 'Track progress'}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* ─── 5. ACTIVE SUBJECT & DAILY CHECKLIST SPLIT ─── */}
      <section className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5 relative z-20">
        
        {/* Active Subject Module */}
        <div className="bg-[#0f1b3b] border border-[#1f3266] p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider">
                {isAmharic ? 'ካቆሙበት ይቀጥሉ' : 'Active Subject'}
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">Unit 3 Active</span>
            </div>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 text-white flex items-center justify-center font-serif font-black text-lg shrink-0 shadow-md">
                {lastActiveSubject.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  {lastActiveSubject}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isAmharic ? 'ምዕራፍ 3፥ አጠቃላይ ማጠቃለያ እና የፈተና ጥያቄዎች' : 'Unit 3: Comprehensive Review & Key Concepts'}
                </p>
              </div>
            </div>

            {/* Subject progress */}
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{isAmharic ? 'የትምህርቱ እድገት' : 'Subject Mastery Progress'}</span>
                <span className="font-mono text-emerald-400 font-extrabold">45%</span>
              </div>
              <div className="w-full h-2.5 bg-[#070d21] rounded-full overflow-hidden border border-[#1b2a52]">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            {lastScore && (
              <p className="text-[11px] text-slate-400 font-mono mt-2">
                🎯 {isAmharic ? `ያለፈው ፈተና ውጤት: ${lastScore}%` : `Last quiz evaluation score: ${lastScore}%`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-[#1e3061]">
            <button
              onClick={() => { playClickChime(); onNavigate('notes'); }}
              className="flex-1 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <BookOpen className="w-4 h-4" />
              {isAmharic ? 'ማስታወሻ አጥና' : 'Study Notes'}
            </button>
            <button
              onClick={() => { playClickChime(); onNavigate('quiz'); }}
              className="flex-1 h-11 px-4 rounded-xl bg-[#14234c] hover:bg-[#1a2d61] border border-[#21356e] text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 text-amber-400" />
              {isAmharic ? 'ፈተና ጀምር' : 'Quick Quiz'}
            </button>
          </div>
        </div>

        {/* Daily Study Checklist */}
        <div className="bg-[#0f1b3b] border border-[#1f3266] p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                {isAmharic ? 'የዛሬ የጥናት ስራዎች' : "Today's Study Checklist"}
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                {completedTasksCount}/{dailyTasks.length} Done
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {dailyTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    task.completed
                      ? 'bg-[#080f24] border-emerald-500/30 text-slate-400 opacity-80'
                      : 'bg-[#14234c] border-[#20346a] hover:border-blue-500/50 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 pr-2">
                    <button className="shrink-0 text-emerald-400">
                      {task.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                    </button>
                    <span className={`text-xs leading-snug ${task.completed ? 'line-through text-slate-400' : 'font-medium'}`}>
                      {isAmharic ? task.titleAm : task.titleEn}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-400 shrink-0 bg-[#080f24] px-2 py-0.5 rounded border border-[#1f3266]">
                    {task.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 text-right">
            <button
              onClick={() => { playClickChime(); onNavigate('quiz'); }}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isAmharic ? 'ተጨማሪ ጥያቄዎች ለመስራት' : 'Open Practice Center'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 6. ETHIOPIAN ACADEMIC PROVERB BANNER ─── */}
      <section className="mb-6 relative z-20">
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-blue-500/15 border border-amber-500/30 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {isAmharic ? 'የዕለቱ የትምህርት ጥበብ' : 'Daily Academic Proverb'}
              </span>
              <span className="text-xs text-amber-400 font-mono">• Daily Insight</span>
            </div>
            <p className="text-sm italic font-serif text-slate-100 leading-relaxed">
              {isAmharic 
                ? `"ዕውቀት የብርሃን ምንጭ ነው፤ በቀን ጥቂት ደቂቃ ማጥናት ለታላቅ ውጤት ያበቃል!"`
                : `"Knowledge is the true lamp of progress. Dedicate small, consistent moments every day to achieve extraordinary mastery."`}
            </p>
          </div>

          <button
            onClick={() => { playClickChime(); onNavigate('tutor'); }}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 transition-colors cursor-pointer shadow-md"
          >
            {isAmharic ? 'አይ መምህርን ጠይቅ' : 'Ask AI Tutor'}
          </button>
        </div>
      </section>

      {/* ─── 7. RECOMMENDED CURRICULUM CATALOG ─── */}
      <section className="mb-6 relative z-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-serif font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-400" />
              {isAmharic ? 'የትምህርት ደረጃ ፕሮግራም' : 'Recommended Curriculum Catalog'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAmharic ? 'የተዘጋጁ የትምህርት ሞጁሎች' : 'Hand-crafted course modules for students'}
            </p>
          </div>

          {/* Academic Level Pill Switcher */}
          <div className="flex bg-[#0f1b3b] border border-[#1f3266] p-1 rounded-2xl self-start sm:self-auto shadow-inner">
            <button
              onClick={() => { playClickChime(); onUpdateGrade('Grade 12'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeLevel === 'Grade 12'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAmharic ? 'ክፍል 12 (ብሔራዊ ፈተና)' : 'Grade 12 Prep'}
            </button>
            <button
              onClick={() => { playClickChime(); onUpdateGrade('University'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeLevel === 'University'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAmharic ? 'ዩኒቨርሲቲ (Freshman)' : 'University Freshman'}
            </button>
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const isBookmarked = favoritedCourses.includes(course.id);
            return (
              <div 
                key={course.id}
                onClick={() => { playClickChime(); onNavigate('bookstore'); }}
                className="bg-[#0f1b3b] border border-[#1f3266] hover:border-blue-500/60 p-5 rounded-3xl flex flex-col justify-between transition-all hover:bg-[#152550] cursor-pointer group shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                      {course.subject}
                    </span>
                    
                    {/* Favorite Button */}
                    <button
                      onClick={(e) => toggleCourseFavorite(course.id, e)}
                      className="p-1.5 rounded-xl bg-[#080f24] hover:bg-[#121f45] text-slate-400 hover:text-amber-400 transition-colors shrink-0 border border-[#1f3266]"
                      title={isAmharic ? 'ኮርሱን ይምረጡ' : 'Bookmark course'}
                    >
                      <Star 
                        className={`w-4 h-4 transition-all ${
                          isBookmarked 
                            ? 'fill-amber-400 text-amber-400 scale-110' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`} 
                      />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2 leading-tight">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Metadata Footer */}
                <div className="mt-4 pt-3 border-t border-[#1f3266] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{course.lessonsCount} {isAmharic ? 'ትምህርቶች' : 'Lessons'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{course.goalDays} {isAmharic ? 'ቀናት' : 'Days Goal'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── NOTIFICATION DETAIL MODAL POPUP ─── */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1b3b] border border-[#22376e] rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-slate-100">
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-[#182854]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Bell className="w-4 h-4" />
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Academic Alert
              </span>
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {isAmharic ? selectedNotification.titleAm : selectedNotification.titleEn}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-4 bg-[#081026] p-3.5 rounded-2xl border border-[#1b2a52]">
              {isAmharic ? selectedNotification.descAm : selectedNotification.descEn}
            </p>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[10px] font-mono text-slate-400">
                {isAmharic ? selectedNotification.timeAm : selectedNotification.timeEn}
              </span>
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
              >
                {isAmharic ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="mt-auto pt-6 border-t border-[#18264d] flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-3 relative z-20">
        <div className="flex items-center gap-2">
          <span>© 2026 EthioLearn Pro. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>{isAmharic ? 'የተረጋገጠ የጥናት ማዕከል' : 'Verified Learning Hub Engine'}</span>
        </div>
      </footer>
    </div>
  );
}
