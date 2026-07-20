import React, { useState } from 'react';
import { 
  Bot, Award, BookOpen, Play, GraduationCap, ChevronRight, FileText, Sparkles, Bell, Star, Clock, CheckCircle, Flame
} from 'lucide-react';
import { StudentProfile } from '../types';
import { playClickChime, playSuccessChime } from '../utils/audio';
import { safeStorage } from '../utils/safeStorage';

interface HomeDashboardProps {
  profile: StudentProfile;
  language: 'en' | 'am';
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

export default function HomeDashboard({
  profile,
  language,
  onNavigate,
  onUpdateGrade,
  streakCount,
  studyHoursCount
}: HomeDashboardProps) {

  // Dynamic status/level calculator (based on activity, tiered, not purchasable)
  const getProgressLevel = () => {
    if (streakCount >= 15 || studyHoursCount >= 30) {
      return {
        en: 'Elite Scholar',
        am: 'ልሂቅ ተማሪ',
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
        badge: '🏆'
      };
    } else if (streakCount >= 7 || studyHoursCount >= 15) {
      return {
        en: 'Advanced',
        am: 'ከፍተኛ ደረጃ',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
        badge: '🎖️'
      };
    } else if (streakCount >= 3 || studyHoursCount >= 5) {
      return {
        en: 'Intermediate',
        am: 'መካከለኛ ደረጃ',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
        badge: '⭐'
      };
    } else {
      return {
        en: 'Beginner',
        am: 'ጀማሪ ተማሪ',
        color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
        badge: '🎓'
      };
    }
  };

  const levelInfo = getProgressLevel();

  // Load last active subject
  const lastActiveSubject = safeStorage.getItem('ethiolearn_last_subject') || profile.subjects[0] || "Emerging Technologies";
  const lastScore = safeStorage.getItem('ethiolearn_last_quiz_score');

  // Bookmarks/Favorites for recommended courses
  const [favoritedCourses, setFavoritedCourses] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem('ethiolearn_bookmarked_courses');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Notification center state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: '1', textEn: 'New Emerging Technologies exam module added!', textAm: 'አዲስ የኤመርጂንግ ቴክኖሎጂስ የፈተና ሞጁል ተጨምሯል!', timeEn: '2h ago', timeAm: 'ከ2 ሰዓት በፊት', read: false },
    { id: '2', textEn: 'You achieved an Intermediate status! Keep up the daily streak.', textAm: 'መካከለኛ ደረጃን አግኝተዋል! የቀን ጥናትዎን ይቀጥሉ።', timeEn: '1d ago', timeAm: 'ከ1 ቀን በፊት', read: false },
    { id: '3', textEn: 'Mathematics formulas PDF is now viewable in Books tab.', textAm: 'የሂሳብ ቀመሮች ማጠቃለያ መጽሐፍ በ Books ክፍል ውስጥ ይገኛል።', timeEn: '2d ago', timeAm: 'ከ2 ቀን በፊት', read: true },
  ]);

  const hasUnreadNotifications = notifications.some(n => !n.read);

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

  // 6. Recommended course catalog based on student standard level
  const RECOMMENDED_COURSES: RecommendedCourse[] = [
    {
      id: 'math_prep_12',
      title: 'Mathematics National Exam Blueprint',
      description: 'Master calculus, integration, sequences, and logic equations designed specifically for Grade 12 entrants.',
      level: 'Grade 12',
      lessonsCount: 16,
      goalDays: 30,
      subject: 'Mathematics'
    },
    {
      id: 'econ_intro_12',
      title: 'Principles of Economics (Grade 12)',
      description: 'Demystifying supply, demand, market structure, macroeconomics, and the Ethiopian local economic metrics.',
      level: 'Grade 12',
      lessonsCount: 12,
      goalDays: 20,
      subject: 'Introduction to Economics'
    },
    {
      id: 'eng_comm_12',
      title: 'Communicative English Mastery',
      description: 'Essential sentence correction guides, listening comprehension drills, and vocabulary builders.',
      level: 'Grade 12',
      lessonsCount: 14,
      goalDays: 15,
      subject: 'Communicative English'
    },
    {
      id: 'emerging_tech_uni',
      title: 'Emerging Technologies & Modern Systems',
      description: 'Comprehensive guide covering Cloud, AI foundations, Blockchain, Big Data, and IoT application architectures.',
      level: 'University',
      lessonsCount: 18,
      goalDays: 25,
      subject: 'Emerging Technologies'
    },
    {
      id: 'logic_critical_uni',
      title: 'Rigorous Logic & Critical Reasoning',
      description: 'Sharpen your analytical reasoning, detect fallacies, and analyze logical statements with interactive exercises.',
      level: 'University',
      lessonsCount: 15,
      goalDays: 22,
      subject: 'Logic and Critical Thinking'
    },
    {
      id: 'moral_civic_uni',
      title: 'Moral and Civic Education Foundations',
      description: 'Explore ethics, state institutions, citizenship laws, and constitutional governance in the modern world.',
      level: 'University',
      lessonsCount: 10,
      goalDays: 18,
      subject: 'Moral and Civic Education'
    }
  ];

  // Helper mapping: "Grade 12" <-> "Beginner" (which is Grade 12 in other tabs), "University" <-> "University"
  const activeLevel = profile.year === 'University' ? 'University' : 'Grade 12';

  // Filter recommended courses based on academic level selected
  const filteredCourses = RECOMMENDED_COURSES.filter(c => c.level === activeLevel);

  return (
    <div id="etlearn-dashboard-root" className="min-h-screen bg-[#0a1128] text-white p-4 md:p-6 rounded-3xl shadow-2xl border border-[#1b264f] relative overflow-hidden flex flex-col font-sans">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute bottom-10 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none select-none" />
      
      {/* 1. Header Bar */}
      <header className="flex items-center justify-between pb-6 border-b border-[#1b264f] relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-bold text-white text-lg tracking-wider shadow-md">
            E
          </div>
          <span className="font-serif font-extrabold text-xl tracking-wider bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            ETLEARN
          </span>
        </div>

        {/* Notification center trigger */}
        <div className="relative">
          <button
            onClick={() => { playClickChime(); setShowNotifications(!showNotifications); }}
            className="w-11 h-11 rounded-xl bg-[#131d3f] hover:bg-[#1c2957] border border-[#1b264f] flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer relative"
            title={language === 'en' ? 'Notifications' : 'ማስታወቂያዎች'}
          >
            <Bell className="w-5 h-5" />
            {hasUnreadNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#22c55e] rounded-full border-2 border-[#131d3f] animate-ping" />
            )}
            {hasUnreadNotifications && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#22c55e] rounded-full border-2 border-[#131d3f]" />
            )}
          </button>

          {/* Notifications Dropdown Drawer */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-[#111a36] border border-[#1b264f] rounded-2xl shadow-2xl p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1b264f]">
                <span className="font-bold text-slate-200">
                  {language === 'en' ? 'Recent Alerts' : 'የቅርብ ጊዜ መልእክቶች'}
                </span>
                <button 
                  onClick={markAllNotificationsAsRead}
                  className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  {language === 'en' ? 'Mark read' : 'ሁሉንም አንብቤያለሁ'}
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className={`p-2.5 rounded-xl border transition-colors ${n.read ? 'bg-transparent border-[#1b264f]/40 text-zinc-400' : 'bg-[#18244b] border-emerald-500/20 text-white'}`}>
                    <p className="leading-relaxed font-sans">{language === 'en' ? n.textEn : n.textAm}</p>
                    <span className="block mt-1 text-[9px] font-mono opacity-60 text-emerald-400">
                      {language === 'en' ? n.timeEn : n.timeAm}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. Greeting Section */}
      <section className="py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-black text-white leading-tight">
            {language === 'en' ? `Hello, ${profile.name}!` : `ሰላም፥ ${profile.name}! 👋`}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 leading-relaxed max-w-xl font-sans">
            {language === 'en' 
              ? "You're so close to your goals! Let's continue your learning journey."
              : "ለግብዎ በጣም ተቃርበዋል። የትምህርት ጉዞዎን እንቀጥል!"}
          </p>
        </div>

        {/* Non-monetized activity stats badges */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Flame streak */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-[#1c2957]/80 rounded-2xl border border-orange-500/30 shadow-inner">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500/20" />
            <div>
              <span className="block text-[9px] text-orange-400/80 font-bold uppercase tracking-wider">Streak</span>
              <span className="text-xs font-mono font-extrabold text-white">
                {streakCount} {language === 'en' ? 'Days' : 'ቀኖች'}
              </span>
            </div>
          </div>

          {/* Level Badge (Calculated based on study achievements) */}
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border shadow-inner ${levelInfo.color}`}>
            <span className="text-base leading-none">{levelInfo.badge}</span>
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider opacity-80">Rank Level</span>
              <span className="text-xs font-extrabold text-white">
                {language === 'en' ? levelInfo.en : levelInfo.am}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Quick Action Row */}
      <section className="py-2 grid grid-cols-3 gap-3 relative z-10">
        {/* Card 1: AI Tutor */}
        <button
          onClick={() => { playClickChime(); onNavigate('tutor'); }}
          className="flex flex-col items-center justify-between p-3.5 rounded-2xl bg-[#131d3f] border border-[#1b264f] hover:border-blue-500/60 hover:bg-[#182552] transition-all cursor-pointer text-center group h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white mt-1 group-hover:text-blue-400 transition-colors">
              {language === 'en' ? 'AI Tutor' : 'አይ መምህር'}
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'en' ? 'Get help instantly' : 'ፈጣን እርዳታ'}
            </span>
          </div>
        </button>

        {/* Card 2: Exam Prep & Notes */}
        <button
          onClick={() => { playClickChime(); onNavigate('notes'); }}
          className="flex flex-col items-center justify-between p-3.5 rounded-2xl bg-[#131d3f] border border-[#1b264f] hover:border-emerald-500/60 hover:bg-[#182552] transition-all cursor-pointer text-center group h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white mt-1 group-hover:text-emerald-400 transition-colors">
              {language === 'en' ? 'Exam Prep & Notes' : 'ማስታወሻዎች'}
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'en' ? 'Practice & Improve' : 'ከልስና አሻሽል'}
            </span>
          </div>
        </button>

        {/* Card 3: Take a Practice Quiz */}
        <button
          onClick={() => { playClickChime(); onNavigate('quiz'); }}
          className="flex flex-col items-center justify-between p-3.5 rounded-2xl bg-[#131d3f] border border-[#1b264f] hover:border-orange-500/60 hover:bg-[#182552] transition-all cursor-pointer text-center group h-32"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-bold text-white mt-1 group-hover:text-orange-400 transition-colors">
              {language === 'en' ? 'Practice Quiz' : 'የመማሪያ ፈተና'}
            </span>
            <span className="block text-[9px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'en' ? 'Test & Grow' : 'እውቀትህን መዝን'}
            </span>
          </div>
        </button>
      </section>

      {/* 4. "Continue where you left off" Card */}
      <section className="py-4 relative z-10">
        <div className="p-5 rounded-2xl bg-[#131d3f] border border-[#1b264f] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-3 flex-grow">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              {language === 'en' ? 'Continue studying' : 'ካቆሙበት ይቀጥሉ'}
            </span>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-serif font-black shrink-0">
                {lastActiveSubject.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm md:text-base font-bold text-white leading-tight">
                  {lastActiveSubject}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'en' ? 'Unit 3: Comprehensive Review' : 'ምዕራፍ 3፥ አጠቃላይ ማጠቃለያ'}
                </p>
              </div>
            </div>

            {/* Simulated progress bar and dynamic score logs if available */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>{language === 'en' ? 'Overall subject progress' : 'አጠቃላይ የትምህርት እድገት'}</span>
                <span className="font-mono text-emerald-400 font-extrabold">45%</span>
              </div>
              <div className="w-full h-2 bg-[#0c122b] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: '45%' }} />
              </div>
            </div>

            {lastScore && (
              <p className="text-[10px] text-slate-500 font-mono">
                🎯 {language === 'en' ? `Last session quiz evaluation score: ${lastScore}%` : `ያለፈው ፈተና ውጤት: ${lastScore}%`}
              </p>
            )}
          </div>

          {/* Action study buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto mt-2 md:mt-0">
            <button
              onClick={() => { playClickChime(); onNavigate('notes'); }}
              className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              {language === 'en' ? 'Study' : 'አጥና'}
            </button>
            <button
              onClick={() => { playClickChime(); onNavigate('quiz'); }}
              className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-transparent hover:bg-slate-800 border border-[#1b264f] text-slate-300 hover:text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              {language === 'en' ? 'Quiz' : 'ፈተን'}
            </button>
          </div>
        </div>
      </section>

      {/* 5. Select Academic Level Toggle */}
      <section className="py-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-serif font-bold text-white flex items-center gap-1.5">
              <GraduationCap className="w-4.5 h-4.5 text-blue-400" />
              {language === 'en' ? 'Academic Program' : 'የትምህርት ደረጃ ፕሮግራም'}
            </h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">
              {language === 'en' ? 'Filters your recommended catalog below' : 'ከበታች የሚመከሩ ኮርሶችን ለመምረጥ ደረጃ ይምረጡ'}
            </p>
          </div>

          {/* Pill-style togglers */}
          <div className="flex bg-[#131d3f] border border-[#1b264f] p-1 rounded-xl self-start md:self-auto">
            <button
              onClick={() => { playClickChime(); onUpdateGrade('Grade 12'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeLevel === 'Grade 12'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'en' ? 'Beginner' : 'ጀማሪ (ክፍል 12)'}
            </button>
            <button
              onClick={() => { playClickChime(); onUpdateGrade('University'); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                activeLevel === 'University'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'en' ? 'University' : 'ዩኒቨርሲቲ'}
            </button>
          </div>
        </div>

        {/* 6. Recommended course cards list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredCourses.map((course) => {
            const isBookmarked = favoritedCourses.includes(course.id);
            return (
              <div 
                key={course.id}
                onClick={() => { playClickChime(); onNavigate('bookstore'); }}
                className="bg-[#131d3f] border border-[#1b264f] hover:border-blue-500/40 p-4 rounded-2xl flex flex-col justify-between transition-all hover:bg-[#18244f] cursor-pointer group shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg uppercase">
                      {course.subject}
                    </span>
                    
                    {/* Course favorite/bookmark button */}
                    <button
                      onClick={(e) => toggleCourseFavorite(course.id, e)}
                      className="p-1.5 rounded-lg bg-[#0a1128] hover:bg-[#111a36] text-slate-400 hover:text-amber-500 transition-colors shrink-0 border border-[#1b264f]/50"
                      title={language === 'en' ? 'Bookmark course' : 'ኮርሱን ይምረጡ'}
                    >
                      <Star 
                        className={`w-3.5 h-3.5 transition-all ${
                          isBookmarked 
                            ? 'fill-amber-400 text-amber-500 scale-110' 
                            : 'opacity-70 group-hover:opacity-100'
                        }`} 
                      />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight">
                    {course.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                </div>

                {/* Metadata row */}
                <div className="mt-4 pt-3 border-t border-[#1b264f]/60 flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-1 font-mono text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    <span>{course.lessonsCount} {language === 'en' ? 'Lessons' : 'ትምህርቶች'}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Goal: {course.goalDays} {language === 'en' ? 'Days' : 'ቀናት'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Aesthetic pairing hint footer */}
      <footer className="mt-auto pt-6 border-t border-[#1b264f]/40 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-500 gap-2 relative z-10">
        <span>© 2026 EtLearn Study Hub. {language === 'en' ? 'Achieve Higher.' : 'ለላቀ ውጤት እንጥራ።'}</span>
        <div className="flex items-center gap-2 font-mono">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>{language === 'en' ? 'Crafted with server-side AI integration' : 'በአይ የጥናት ድጋፍ የተገነባ'}</span>
        </div>
      </footer>
    </div>
  );
}
