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
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              {isAmharic ? `መልካም ${todayHoliday.nameAm}!` : `Happy ${todayHoliday.nameEn}!`}
            </span>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => { playClickChime(); setShowNotifications(!showNotifications); }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all cursor-pointer text-xs font-medium shadow-sm"
            aria-label="Notifications"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAmharic ? 'ማስታወቂያዎች' : 'Updates'}</span>
            {unreadCount > 0 && (
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="font-semibold text-white">Notifications</span>
                <button 
                  onClick={markAllNotificationsAsRead}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer"
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
                        ? 'bg-slate-950/40 border-slate-800/60 text-slate-400' 
                        : 'bg-amber-500/10 border-amber-500/20 text-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="font-medium text-slate-100">{isAmharic ? n.titleAm : n.titleEn}</span>
                      <span className="text-[9px] text-slate-400 font-mono">{isAmharic ? n.timeAm : n.timeEn}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{isAmharic ? n.descAm : n.descEn}</p>
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
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 p-6 sm:p-7 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              {isAmharic ? 'የዛሬው የጥናት ትኩረት' : "Today's Focus"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              {isAmharic ? `ሰላም፥ ${profile.name || 'ተማሪ'}` : `Welcome back, ${profile.name || 'Student'}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-xl">
              {isAmharic 
                ? 'በቅርቡ የጀመሩትን ትምህርት በመቀጠል የዛሬውን የጥናት ግብዎን ያጠናቅቁ።'
                : 'Pick up where you left off in your active module to reach your daily study goal.'}
            </p>
          </div>

          {/* Active Subject Continuation Strip */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                {lastActiveSubject.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">{lastActiveSubject}</span>
                <span className="text-[11px] text-slate-400">Active Course • Semester 1</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => { playClickChime(); onNavigate('notes'); }}
                className="flex-1 sm:flex-none h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                <span>{isAmharic ? 'ትምህርት ቀጥል' : 'Continue Lesson'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { playClickChime(); onNavigate('quiz'); }}
                className="flex-1 sm:flex-none h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                {isAmharic ? 'ፈተና' : 'Take Quiz'}
              </button>
            </div>
          </div>
        </div>

        {/* Daily Goal & Streak Panel */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isAmharic ? 'የዕለቱ ግብ' : 'Daily Goal'}
              </span>
              <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 text-xs font-mono">
                <button onClick={() => updateTargetHours(-0.5)} className="text-slate-400 hover:text-white px-1 cursor-pointer">-</button>
                <span className="text-slate-200">{targetHours}h</span>
                <button onClick={() => updateTargetHours(0.5)} className="text-slate-400 hover:text-white px-1 cursor-pointer">+</button>
              </div>
            </div>

            <div className="space-y-2 my-3">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-white tracking-tight">
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
                {isAmharic ? 'የዩኒቨርሲቲ ፈተናዎች' : 'Uni Exams'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Model Papers</span>
            </div>
          </button>

          {/* Textbooks / Bookstore */}
          <button
            onClick={() => { playClickChime(); onNavigate('bookstore'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <BookOpen className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'ዲጂታል መጻሕፍት' : 'Book Store'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">PDF Textbooks</span>
            </div>
          </button>

          {/* Analytics */}
          <button
            onClick={() => { playClickChime(); onNavigate('profile'); }}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition-all cursor-pointer text-left group flex flex-col justify-between h-28 shadow-sm hover:shadow-md"
          >
            <TrendingUp className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div>
              <span className="block text-xs font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                {isAmharic ? 'የጥናት እድገት' : 'Analytics'}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5">Progress Reports</span>
            </div>
          </button>
        </div>
      </section>

      {/* ─── 4. DAILY CHECKLIST & CURRICULUM TRACK SPLIT ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Daily Study Checklist */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isAmharic ? 'የዛሬ የጥናት ስራዎች' : "Today's Tasks"}
              </h3>
              <span className="text-[10px] font-mono text-amber-400 font-medium">
                {completedTasksCount}/{dailyTasks.length} Completed
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

        {/* Recommended Curriculum Track */}
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

            <div className="space-y-2">
              {filteredCourses.slice(0, 2).map((course) => {
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
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{course.description}</p>
                    </div>

                    <button
                      onClick={(e) => toggleCourseFavorite(course.id, e)}
                      className="text-slate-500 hover:text-amber-400 transition-colors p-1"
                    >
                      <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
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
