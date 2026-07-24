import React, { useState } from 'react';
import { 
  Bot, BookOpen, Play, GraduationCap, FileText, Bell, Star, Clock, CheckCircle, Flame, Calendar,
  Target, CheckSquare, Square, TrendingUp, ArrowRight, ShieldCheck, X, ChevronRight, Bookmark
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

  const RECOMMENDED_COURSES: RecommendedCourse[] = [
    {
      id: 'emerging_tech_uni',
      title: 'Emerging Technologies & Modern Systems',
      description: 'Cloud architectures, AI foundations, Big Data, and IoT applications.',
      level: 'University',
      lessonsCount: 18,
      goalDays: 25,
      subject: 'Emerging Tech'
    },
    {
      id: 'logic_critical_uni',
      title: 'Logic & Critical Reasoning',
      description: 'Analytical reasoning, fallacy detection, and formal logic structures.',
      level: 'University',
      lessonsCount: 15,
      goalDays: 22,
      subject: 'Logic'
    },
    {
      id: 'math_prep_12',
      title: 'Mathematics National Exam Blueprint',
      description: 'Calculus, sequences, and algebra tailored for Grade 12 entrants.',
      level: 'Grade 12',
      lessonsCount: 16,
      goalDays: 30,
      subject: 'Mathematics'
    },
    {
      id: 'econ_intro_12',
      title: 'Principles of Economics',
      description: 'Microeconomics, supply-demand mechanics, and national economic indicators.',
      level: 'Grade 12',
      lessonsCount: 12,
      goalDays: 20,
      subject: 'Economics'
    }
  ];

  const activeLevel = profile.year === 'University' ? 'University' : 'Grade 12';
  const filteredCourses = RECOMMENDED_COURSES.filter(c => c.level === activeLevel);
  const completedTasksCount = dailyTasks.filter(t => t.completed).length;
  const progressPercent = Math.min(100, Math.round((studyHoursCount / targetHours) * 100));

  return (
    <div id="etlearn-dashboard-root" className="w-full space-y-6 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* ─── 1. TOP SUB-BAR (Notifications & Quick Holiday Notice) ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {todayHoliday && (
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-medium">
              {isAmharic ? `መልካም ${todayHoliday.nameAm}!` : `Happy ${todayHoliday.nameEn}!`}
            </span>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => { playClickChime(); setShowNotifications(!showNotifications); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer text-xs font-medium shadow-xs"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{isAmharic ? 'ማስታወቂያዎች' : 'Updates'}</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-zinc-800">
                <span className="font-semibold text-slate-900 dark:text-white">Notifications</span>
                <button 
                  onClick={markAllNotificationsAsRead}
                  className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Mark all read
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map(n => (
                  <div 
                    key={n.id}
                    onClick={() => setSelectedNotification(n)}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      n.read 
                        ? 'bg-slate-50 dark:bg-zinc-950/40 border-slate-100 dark:border-zinc-800/60 text-slate-500' 
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{isAmharic ? n.titleAm : n.titleEn}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{isAmharic ? n.timeAm : n.timeEn}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{isAmharic ? n.descAm : n.descEn}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. PRIMARY FOCUS HERO (Restrained Single Focal Point) ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main Greeting & Primary Action Card */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 p-6 sm:p-7 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {isAmharic ? 'የዛሬው የጥናት ትኩረት' : "Today's Focus"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
              {isAmharic ? `ሰላም፥ ${profile.name || 'ተማሪ'}` : `Welcome back, ${profile.name || 'Student'}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-xl">
              {isAmharic 
                ? 'በቅርቡ የጀመሩትን ትምህርት በመቀጠል የዛሬውን የጥናት ግብዎን ያጠናቅቁ።'
                : 'Pick up where you left off in your active module to reach your daily study goal.'}
            </p>
          </div>

          {/* Active Subject Continuation Strip */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center font-bold text-sm shrink-0">
                {lastActiveSubject.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-900 dark:text-white block">{lastActiveSubject}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Unit 3 • 45% Completed</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { playClickChime(); onNavigate('notes'); }}
                className="flex-1 sm:flex-none h-9 px-4 rounded-xl bg-[#078930] hover:bg-[#067328] text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                {isAmharic ? 'ትምህርት ቀጥል' : 'Continue Lesson'}
              </button>
              <button
                onClick={() => { playClickChime(); onNavigate('quiz'); }}
                className="flex-1 sm:flex-none h-9 px-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                {isAmharic ? 'ፈተና' : 'Take Quiz'}
              </button>
            </div>
          </div>
        </div>

        {/* Daily Goal & Streak Panel */}
        <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 p-6 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isAmharic ? 'የዕለቱ ግብ' : 'Daily Goal'}
              </span>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-zinc-950 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-mono">
                <button onClick={() => updateTargetHours(-0.5)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white px-1 cursor-pointer">-</button>
                <span className="text-slate-700 dark:text-slate-300">{targetHours}h</span>
                <button onClick={() => updateTargetHours(0.5)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white px-1 cursor-pointer">+</button>
              </div>
            </div>

            <div className="space-y-2 my-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                  {studyHoursCount} <span className="text-xs font-normal text-slate-400">/ {targetHours} hrs</span>
                </span>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-zinc-950 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-800">
                <div className="h-full bg-[#078930] rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{streakCount} {isAmharic ? 'ቀናት ቀጣይነት' : 'day streak'}</span>
            </div>
            <button
              onClick={() => { playClickChime(); onNavigate('profile'); }}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[11px] cursor-pointer"
            >
              {isAmharic ? 'ስታቲስቲክስ' : 'View Stats'}
            </button>
          </div>
        </div>
      </section>

      {/* ─── 3. STUDY WORKSPACE GRID (Consistent Quiet Cards) ─── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          {isAmharic ? 'የጥናት ክፍሎች' : 'Workspace Tools'}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* AI Tutor */}
          <button
            onClick={() => { playClickChime(); onNavigate('tutor'); }}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/50 transition-colors cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <Bot className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            <div>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {isAmharic ? 'አይ መምህር' : 'AI Tutor'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Interactive Q&A</span>
            </div>
          </button>

          {/* Exam Prep Notes */}
          <button
            onClick={() => { playClickChime(); onNavigate('notes'); }}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/50 transition-colors cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            <div>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {isAmharic ? 'ፈተና ዝግጅት' : 'Study Notes'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Summaries</span>
            </div>
          </button>

          {/* Practice Quiz */}
          <button
            onClick={() => { playClickChime(); onNavigate('quiz'); }}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/50 transition-colors cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <Play className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            <div>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {isAmharic ? 'ልምምድ' : 'Practice Quiz'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Test knowledge</span>
            </div>
          </button>

          {/* Curriculum Hub */}
          <button
            onClick={() => { playClickChime(); onNavigate(activeLevel === 'University' ? 'university' : 'examprep'); }}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/50 transition-colors cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <GraduationCap className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            <div>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {activeLevel === 'University' ? (isAmharic ? 'ዩኒቨርሲቲ' : 'Freshman Hub') : (isAmharic ? 'ብሔራዊ ፈተና' : 'National Exam')}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Curriculum</span>
            </div>
          </button>

          {/* Textbooks */}
          <button
            onClick={() => { playClickChime(); onNavigate('bookstore'); }}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/50 transition-colors cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            <div>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {isAmharic ? 'መጻሕፍት' : 'Textbooks'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">PDF library</span>
            </div>
          </button>

          {/* Analytics */}
          <button
            onClick={() => { playClickChime(); onNavigate('profile'); }}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 hover:border-emerald-500/50 transition-colors cursor-pointer text-left group flex flex-col justify-between h-28 shadow-xs"
          >
            <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
            <div>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                {isAmharic ? 'እድገት' : 'Analytics'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Progress reports</span>
            </div>
          </button>
        </div>
      </section>

      {/* ─── 4. DAILY CHECKLIST & CURRICULUM TRACK SPLIT ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Daily Study Checklist */}
        <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {isAmharic ? 'የዛሬ የጥናት ስራዎች' : "Today's Tasks"}
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {completedTasksCount}/{dailyTasks.length} Completed
              </span>
            </div>

            <div className="space-y-2">
              {dailyTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-center justify-between ${
                    task.completed
                      ? 'bg-slate-50 dark:bg-zinc-950/40 border-slate-200/60 dark:border-zinc-800/60 text-slate-400 dark:text-slate-500'
                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button className="shrink-0 text-emerald-600 dark:text-emerald-400">
                      {task.completed ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-300 dark:text-zinc-600" />}
                    </button>
                    <span className={`text-xs ${task.completed ? 'line-through' : 'font-medium'}`}>
                      {isAmharic ? task.titleAm : task.titleEn}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{task.duration}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-right">
            <button
              onClick={() => { playClickChime(); onNavigate('quiz'); }}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
            >
              <span>{isAmharic ? 'የፈተና ማዕከል' : 'Practice Center'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recommended Curriculum Track */}
        <div className="bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {isAmharic ? 'የኮርስ ሞጁሎች' : 'Curriculum Track'}
              </h3>
              
              {/* Program Switcher */}
              <div className="flex bg-slate-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-[11px]">
                <button
                  onClick={() => { playClickChime(); onUpdateGrade('Grade 12'); }}
                  className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    activeLevel === 'Grade 12' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Grade 12
                </button>
                <button
                  onClick={() => { playClickChime(); onUpdateGrade('University'); }}
                  className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    activeLevel === 'University' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-semibold shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  University
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {filteredCourses.slice(0, 2).map((course) => {
                const isBookmarked = favoritedCourses.includes(course.id);
                return (
                  <div
                    key={course.id}
                    onClick={() => { playClickChime(); onNavigate('bookstore'); }}
                    className="p-3.5 rounded-xl bg-slate-50/50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block mb-0.5">{course.subject}</span>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{course.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{course.description}</p>
                    </div>

                    <button
                      onClick={(e) => toggleCourseFavorite(course.id, e)}
                      className="text-slate-400 hover:text-amber-500 transition-colors p-1"
                    >
                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-right">
            <button
              onClick={() => { playClickChime(); onNavigate('bookstore'); }}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1 font-medium"
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
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-slate-800 dark:text-slate-100">
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg bg-slate-100 dark:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>

            <span className="text-[10px] font-mono text-slate-400 block mb-1">
              {isAmharic ? selectedNotification.timeAm : selectedNotification.timeEn}
            </span>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              {isAmharic ? selectedNotification.titleAm : selectedNotification.titleEn}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAmharic ? selectedNotification.descAm : selectedNotification.descEn}
            </p>

            <button
              onClick={() => setSelectedNotification(null)}
              className="mt-5 w-full py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
