/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentProfile } from '../types';
import { playClickChime, playSuccessChime, playFailureChime } from '../utils/audio';
import { googleSignIn, googleSignInRedirect } from '../utils/workspace';
import { getSupabase, saveSupabaseCredentials, initSupabaseConfig } from '../utils/supabaseClient';
import { 
  Key, User, Landmark, GraduationCap, ArrowRight, Info, Eye, EyeOff, 
  Mail, Lock, LogIn, UserPlus, ArrowLeft, ShieldAlert, CheckCircle, Database,
  Bot, Sparkles, BookOpen, Layers, MessageSquare, Globe, ChevronRight, ChevronLeft, ThumbsUp, Send, RefreshCw, X
} from 'lucide-react';
import EthioLearnLogo from './EthioLearnLogo';
import StudentAvatarSelector from './StudentAvatarSelector';
import StudentAvatar from './StudentAvatar';

export const ETHIOPIAN_UNIVERSITIES = [
  "Addis Ababa University (AAU)",
  "Adama Science and Technology University (ASTU)",
  "Addis Ababa Science and Technology University (AASTU)",
  "Ambo University (AU)",
  "Arba Minch University (AMU)",
  "Admas University (Private)",
  "Assosa University",
  "Arsi University",
  "Bahir Dar University (BDU)",
  "Bule Hora University",
  "Debre Markos University (DMU)",
  "Debre Birhan University (DBU)",
  "Dire Dawa University (DDU)",
  "Dilla University",
  "Gondar University (UoG)",
  "Gambella University",
  "Haramaya University (HrU)",
  "Hawassa University (HU)",
  "Jimma University (JU)",
  "Jijiga University (JJU)",
  "Kotebe Metropolitan University",
  "Mekelle University (MU)",
  "Mettu University",
  "Mizan-Tepi University",
  "MicroLink Information Technology College",
  "Rift Valley University (Private)",
  "Semera University",
  "St. Mary's University (Private)",
  "Unity University (Private)",
  "Wolkite University (WKU)",
  "Wollo University (WU)",
  "Wachemo University",
  "Other / Private College"
];

export const onboardingTranslations = {
  en: {
    title: "Create Account",
    academicReg: "Academic Registration",
    setCohort: "SET UP COHORT MEMBERSHIP",
    tagline: "AI-Powered Educational Platform for Ethiopian University Students",
    fullName: "Full Name",
    fullNamePlaceholder: "e.g. Abebe Kebede",
    university: "University / College",
    universityPlaceholder: "Search or select your university",
    email: "Email Address",
    emailPlaceholder: "student@gmail.com",
    password: "Academy Password",
    passwordPlaceholder: "Minimum 5 characters",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    alreadyHaveAccount: "Already have an account?",
    loginLink: "Log in",
    createAccountBtn: "Create Account",
    loading: "Creating Account...",
    googleRegisterBtn: "Register instantly with Google",
    validationName: "Please enter your full name.",
    validationUniversity: "Please select or type your university.",
    validationEmail: "Please enter a valid Gmail address (@gmail.com).",
    validationPassword: "Password must be at least 5 characters long.",
    validationConfirmPassword: "Passwords do not match.",
    academicStanding: "Academic Standing",
    academicStandingPlaceholder: "Select your standing",
    grade12: "Grade 12 (Preparatory Senior)",
    universityStudent: "University Student",
    chooseAvatar: "Select Custom Portrait Avatar",
    assignModules: "Assign Campus Focus Modules (Select one or more)",
    rememberSession: "Remember session (One-click Login)",
    personalIdentity: "1. Student Identity & Persona",
    academicStandingHeader: "2. Academic Standing & Enrollment",
    registerEnter: "Register & Enter Campus"
  },
  am: {
    title: "መለያ ፍጠር",
    academicReg: "የአካዳሚክ ምዝገባ",
    setCohort: "የቡድን አባልነት ያዋቅሩ",
    tagline: "ለኢትዮጵያ ዩኒቨርሲቲ ተማሪዎች በAI የተደገፈ የትምህርት መድረክ",
    fullName: "ሙሉ ስም",
    fullNamePlaceholder: "ምሳሌ፡ አበበ ከበደ",
    university: "ዩኒቨርሲቲ / ኮሌጅ",
    universityPlaceholder: "ዩኒቨርሲቲዎን ይፈልጉ ወይም ይምረጡ",
    email: "የኢሜይል አድራሻ",
    emailPlaceholder: "student@gmail.com",
    password: "የአካዳሚ የይለፍ ቃል",
    passwordPlaceholder: "ቢያንስ 5 ቁምፊዎች",
    confirmPassword: "የይለፍ ቃል ያረጋግጡ",
    confirmPasswordPlaceholder: "የይለፍ ቃልዎን እንደገና ያስገቡ",
    alreadyHaveAccount: "ቀድሞውኑ መለያ አለዎት?",
    loginLink: "ይግቡ",
    createAccountBtn: "መለያ ፍጠር",
    loading: "በመፍጠር ላይ...",
    googleRegisterBtn: "በGoogle ፈጣን ምዝገባ",
    validationName: "እባክዎን ሙሉ ስምዎን ያስገቡ።",
    validationUniversity: "እባክዎን ዩኒቨርሲቲዎን ይምረጡ ወይም ያስገቡ።",
    validationEmail: "እባክዎን ትክክለኛ የጂሜይል አድራሻ ያስገቡ (@gmail.com)።",
    validationPassword: "የይለፍ ቃል ቢያንስ 5 ቁምፊዎች መሆን አለበት።",
    validationConfirmPassword: "የይለፍ ቃሎች አይዛመዱም።",
    academicStanding: "የትምህርት ደረጃ",
    academicStandingPlaceholder: "ደረጃዎን ይምረጡ",
    grade12: "ክፍል 12 (ዝግጅት ከፍተኛ)",
    universityStudent: "የዩኒቨርሲቲ ተማሪ",
    chooseAvatar: "ብጁ የቁም አምሳያ ይምረጡ",
    assignModules: "የካምፓስ የትኩረት ሞጁሎችን ይመድቡ (አንድ ወይም ከዚያ በላይ ይምረጡ)",
    rememberSession: "ክፍለ-ጊዜን አስታውስ (ባንድ ጠቅታ መግቢያ)",
    personalIdentity: "1. የተማሪ ማንነት እና ባህሪ",
    academicStandingHeader: "2. የትምህርት ደረጃ እና ምዝገባ",
    registerEnter: "ይመዝገቡ እና ግቢ ይግቡ"
  }
};

// Onboarding Translation Config
export const onboardingFlowTranslations = {
  en: {
    skip: "Skip",
    next: "Next",
    back: "Back",
    getStarted: "Get Started",
    tryItNow: "Try it Now",
    createAccount: "Create Free Account",
    loginLink: "Already have an account? Sign In",
    
    // Screen 1: Welcome
    screen1Bubble: "ሰላም! እኔ አስጎብኚ ነኝ 👋 / Hi! I'm አስጎብኚ, your study buddy",
    screen1Headline: "EthioLearn Pro",
    screen1Tagline: "AI-Powered Educational Platform for Ethiopian University Students",
    
    // Screen 2: AI Tutor
    screen2Bubble: "Ask me anything — in Amharic or English — anytime you're stuck.",
    screen2Headline: "Personal AI Study Companion",
    screen2Sub: "Get instant step-by-step guidance tailored specifically to your university and high school curriculum.",
    
    // Screen 3: Flashcards
    screen3Bubble: "I'll quiz you with flashcards that get smarter the more you study.",
    screen3Headline: "Adaptive Smart Flashcards",
    screen3Sub: "Interactive study decks that track your strengths and weaknesses to supercharge active recall.",
    
    // Screen 4: Universities
    screen4Bubble: "I know what your university needs — Wolkite, AAU, and more.",
    screen4Headline: "Aligned with Ethiopian Campuses",
    screen4Sub: "Access past department exams, focus modules, and curricula from Wolkite, AAU, ASTU, and other local universities.",
    
    // Screen 5: Try AI Tutor
    screen5BubbleInitial: "Go ahead! Ask me a study question to see me in action.",
    screen5BubbleResponse: "See? That's me at work. Want unlimited access?",
    screen5Headline: "Interact with አስጎብኚ",
    screen5Sub: "Experience our high-speed, bilingual academic AI with no registration required.",
    chatPlaceholder: "Ask me anything about your courses..."
  },
  am: {
    skip: "ዝለል",
    next: "ቀጣይ",
    back: "ተመለስ",
    getStarted: "እንጀምር",
    tryItNow: "አሁን ይሞክሩ",
    createAccount: "ነፃ መለያ ፍጠር",
    loginLink: "ቀድሞውኑ መለያ አለዎት? ይግቡ",
    
    // Screen 1: Welcome
    screen1Bubble: "ሰላም! እኔ አስጎብኚ ነኝ 👋 / Hi! I'm አስጎብኚ, your study buddy",
    screen1Headline: "ኢትዮለርን ፕሮ",
    screen1Tagline: "ለኢትዮጵያ ዩኒቨርሲቲ ተማሪዎች በAI የተደገፈ የትምህርት መድረክ",
    
    // Screen 2: AI Tutor
    screen2Bubble: "በአማርኛ ወይም በእንግሊዝኛ ማንኛውንም ነገር ይጠይቁኝ — በማንኛውም ጊዜ ሲቸገሩ።",
    screen2Headline: "የግል የጥናት ረዳት",
    screen2Sub: "ለዩኒቨርሲቲዎ እና ለሁለተኛ ደረጃ ትምህርት ስርዓት በተለየ መልኩ የተዘጋጀ ፈጣን ምላሽ ያግኙ።",
    
    // Screen 3: Flashcards
    screen3Bubble: "በጥናቱ መጠን ይበልጥ ጎበዝ በሚሆኑ ብልጥ ፍላሽ ካርዶች እፈትሻለሁ።",
    screen3Headline: "ብልጥ የፍላሽ ካርድ ጥያቄዎች",
    screen3Sub: "ንቁ የማስታወስ ችሎታን ለማሳደግ ጥንካሬዎችዎን እና ድክመቶችዎን የሚከታተሉ የጥናት ካርዶች።",
    
    // Screen 4: Universities
    screen4Bubble: "ዩኒቨርሲቲዎ ምን እንደሚያስፈልገው አውቃለሁ — ወልቂጤ፣ አዲስ አበባ ዩኒቨርሲቲ እና ሌሎችም።",
    screen4Headline: "ከኢትዮጵያ ግቢዎች ጋር የተናበበ",
    screen4Sub: "የወልቂጤ፣ የአዲስ አበባ፣ የአዳማ ሳይንስ እና ቴክኖሎጂ እና የሌሎች ዩኒቨርሲቲዎችን የፈተና ጥያቄዎች ያግኙ።",
    
    // Screen 5: Try AI Tutor
    screen5BubbleInitial: "ይቀጥሉ! በስራ ላይ እኔን ለማየት የጥናት ጥያቄ ይጠይቁኝ።",
    screen5BubbleResponse: "አዩት አይደል? እኔ በስራ ላይ ነኝ። ያልተገደበ አገልግሎት ይፈልጋሉ?",
    screen5Headline: "ከአስጎብኚ ጋር ይነጋገሩ",
    screen5Sub: "ምንም ምዝገባ ሳይኖርብዎት ፈጣን የሁለት ቋንቋ የጥናት AI ረዳታችንን ይሞክሩ።",
    chatPlaceholder: "ስለ ኮርሶችዎ ማንኛውንም ነገር ይጠይቁኝ..."
  }
};

interface AsgobanyiProps {
  action?: 'wave' | 'point' | 'thumbs-up' | 'idle';
  className?: string;
  size?: number;
}

export function Asgobanyi({ action = 'idle', className = '', size = 100 }: AsgobanyiProps) {
  return (
    <div 
      className={`relative select-none ${className}`}
      style={{ 
        width: size, 
        height: size,
        animation: 'asgobanyi-bounce 3s ease-in-out infinite'
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_4px_12px_rgba(200,150,46,0.25)]">
        {/* Antenna */}
        <line x1="50" y1="22" x2="50" y2="10" stroke="#C8962E" strokeWidth="3" strokeLinecap="round" />
        <circle 
          cx="50" 
          cy="9" 
          r="4.5" 
          fill="#D4AF37" 
          style={{ 
            animation: 'glow-pulse 1.5s infinite alternate' 
          }} 
        />
        
        {/* Ears / Side Connectors */}
        <rect x="26" y="27" width="6" height="12" rx="2" fill="#0f172a" stroke="#D4AF37" strokeWidth="2" />
        <rect x="68" y="27" width="6" height="12" rx="2" fill="#0f172a" stroke="#D4AF37" strokeWidth="2" />
        
        {/* Head */}
        <rect x="30" y="20" width="40" height="26" rx="8" fill="#1e293b" stroke="#D4AF37" strokeWidth="2.5" />
        {/* Screen Background */}
        <rect x="35" y="24" width="30" height="18" rx="4" fill="#090f1d" />
        
        {/* Glowing Eyes */}
        <g>
          {/* Left Eye */}
          <circle cx="43" cy="33" r="3" fill="#D4AF37" className="animate-pulse" />
          <circle cx="43" cy="33" r="1" fill="#fff" />
          
          {/* Right Eye */}
          <circle cx="57" cy="33" r="3" fill="#D4AF37" className="animate-pulse" />
          <circle cx="57" cy="33" r="1" fill="#fff" />
        </g>
        
        {/* Cute Smiling Mouth */}
        <path d="M 46,38 Q 50,41 54,38" stroke="#D4AF37" strokeWidth="2" fill="none" strokeLinecap="round" />
        
        {/* Neck */}
        <rect x="46" y="46" width="8" height="6" fill="#0f172a" stroke="#D4AF37" strokeWidth="1.5" />
        
        {/* Body */}
        <path d="M 34,52 L 66,52 L 62,74 L 38,74 Z" fill="#1e293b" stroke="#D4AF37" strokeWidth="2.5" />
        {/* Screen/Chestplate Accent with Ethiopian Flag Line */}
        <rect x="42" y="56" width="16" height="10" rx="2" fill="#090f1d" stroke="#D4AF37" strokeWidth="1" />
        <g transform="translate(44, 59)">
          <rect x="0" y="0" width="12" height="1.5" fill="#10B981" />
          <rect x="0" y="1.5" width="12" height="1.5" fill="#FFECA7" />
          <rect x="0" y="3" width="12" height="1.5" fill="#EF4444" />
        </g>
        
        {/* Arms */}
        {/* Left Arm */}
        {action === 'point' ? (
          <path d="M 34,56 Q 16,56 12,50" stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 34,56 C 26,58 26,68 30,72" stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        
        {/* Right Arm */}
        {action === 'wave' ? (
          <g style={{ transformOrigin: '66px 56px', animation: 'asgobanyi-wave 1s ease-in-out infinite alternate' }}>
            <path d="M 66,56 Q 84,46 80,30" stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="80" cy="30" r="3" fill="#D4AF37" />
          </g>
        ) : action === 'thumbs-up' ? (
          <g>
            <path d="M 66,56 Q 82,56 82,48" stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 82,48 L 84,48 L 84,42 Q 86,42 86,45 L 82,48" fill="#D4AF37" stroke="#D4AF37" strokeWidth="1" />
            <circle cx="82" cy="48" r="3" fill="#D4AF37" />
          </g>
        ) : (
          <path d="M 66,56 C 74,58 74,68 70,72" stroke="#D4AF37" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}
        
        {/* Tread/Legs base */}
        <ellipse cx="50" cy="80" rx="14" ry="4" fill="#0f172a" stroke="#D4AF37" strokeWidth="2" />
        <line x1="42" y1="82" x2="58" y2="82" stroke="#D4AF37" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

interface SplashOnboardingProps {
  onComplete: (profile: StudentProfile) => void;
  initialProfile?: StudentProfile | null;
}

interface AccountInfo {
  email: string;
  passwordEncrypted: string; // Plain password for prototype/localStorage authenticity
  rememberMe: boolean;
  profile: StudentProfile;
}

export default function SplashOnboarding({ onComplete, initialProfile }: SplashOnboardingProps) {
  // Mode switcher: 'onboarding' | 'splash' | 'signin' | 'signup'
  const [mode, setMode] = useState<'onboarding' | 'splash' | 'signin' | 'signup'>('onboarding');
  
  // Onboarding states
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingChatText, setOnboardingChatText] = useState('');
  const [onboardingChatMessages, setOnboardingChatMessages] = useState<any[]>([]);
  const [onboardingIsTyping, setOnboardingIsTyping] = useState(false);
  const [onboardingAiResponded, setOnboardingAiResponded] = useState(false);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  const getOnboardingFallbackResponse = (query: string, lang: 'en' | 'am') => {
    const q = query.toLowerCase();
    if (q.includes('photo') || q.includes('ቅንጅት')) {
      return lang === 'am'
        ? "ፎቶሲንተሲስ ማለት ዕፅዋት የፀሐይ ብርሃንን፣ ውሃን እና ካርቦን ዳይኦክሳይድን በመጠቀም ኦክስጅንን እና የስኳር ሃይልን የሚያመርቱበት ሂደት ነው! 🌿✨"
        : "Photosynthesis is the process where plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar! 🌿✨";
    }
    if (q.includes('gdp') || q.includes('econ') || q.includes('ኢኮኖሚ')) {
      return lang === 'am'
        ? "ጂዲፒ (ጠቅላላ የአገር ውስጥ ምርት) በአንድ ዓመት ውስጥ በአገር ውስጥ የተመረቱ ዕቃዎችና አገልግሎቶች ጠቅላላ ዋጋ ነው። የአንድ አገር ኢኮኖሚያዊ ውጤት መለኪያ ነው! 📊🇪🇹"
        : "GDP (Gross Domestic Product) is the total value of all goods and services produced in a country in a year. It's like a country's economic report card! 📊🇪🇹";
    }
    if (q.includes('wolkite') || q.includes('ወልቂጤ')) {
      return lang === 'am'
        ? "ወልቂጤ ዩኒቨርሲቲ በጉራጌ ዞን የሚገኝ ኩሩ የኢትዮጵያ ተቋም ነው። በኢንጂነሪንግ፣ በግብርና እና በጥናት ጥራት የታወቀ ነው! 🏫🎓"
        : "Wolkite University (WKU) is a proud Ethiopian institution located in the Gurage Zone. It is known for engineering, agriculture, and academic excellence! 🏫🎓";
    }
    if (q.includes('aau') || q.includes('አዲስ አበባ')) {
      return lang === 'am'
        ? "የአዲስ አበባ ዩኒቨርሲቲ በኢትዮጵያ አንጋፋው እና ትልቁ ዩኒቨርሲቲ ሲሆን፣ ከ1950 ጀምሮ ለምርምር፣ ለታሪክ እና ለሕክምና ግንባር ቀደም ማዕከል ነው! 🏛️🦁"
        : "Addis Ababa University (AAU) is the oldest and largest university in Ethiopia, a leading center for research, history, and medicine since 1950! 🏛️🦁";
    }
    return lang === 'am'
      ? "ይህ በጣም ግሩም የጥናት ጥያቄ ነው! አስጎብኚ ነኝ፣ ጥያቄዎችን ለመፍታት፣ ምዕራፎችን ለማጠቃለል እና ፈተናዎችዎን ለማለፍ እረዳዎታለሁ። አብረን እናጥና! 🚀📚"
      : "That is a great academic question! As your study buddy, I'm here to help you solve equations, summarize chapters, and ace your exams in both Amharic and English. Let's study together! 🚀📚";
  };

  const handleOnboardingChatSubmit = async (text: string) => {
    if (!text.trim() || onboardingIsTyping) return;
    const query = text.trim();
    setOnboardingChatText('');
    
    const userMsg = { role: 'user', content: query };
    const updated = [...onboardingChatMessages, userMsg];
    setOnboardingChatMessages(updated);
    setOnboardingIsTyping(true);
    
    let finished = false;
    const fallbackTimeout = setTimeout(() => {
      if (!finished) {
        const fbResponse = getOnboardingFallbackResponse(query, preferredLanguage);
        setOnboardingChatMessages([...updated, { role: 'assistant', content: fbResponse }]);
        setOnboardingIsTyping(false);
        setOnboardingAiResponded(true);
        playSuccessChime();
        finished = true;
      }
    }, 2000);

    try {
      const { submitClaudeChat } = await import('../utils/ai');
      await submitClaudeChat(
        updated as any,
        "You are አስጎብኚ (Asgobanyi), a friendly bilingual study partner robot for Ethiopian university students. Keep your response brief, encouraging, and exactly 2-3 sentences. Always relate back to helping them in their academic courses. Response can be in Amharic or English.",
        claudeApiKey || "no-key",
        {
          onChunk: () => {},
          onComplete: (fullText) => {
            if (!finished) {
              clearTimeout(fallbackTimeout);
              setOnboardingChatMessages([...updated, { role: 'assistant', content: fullText }]);
              setOnboardingIsTyping(false);
              setOnboardingAiResponded(true);
              playSuccessChime();
              finished = true;
            }
          },
          onError: () => {}
        }
      );
    } catch (e) {
      console.error(e);
    }
  };
  
  // Registration and Authentication inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'am'>('en');
  const [rememberMe, setRememberMe] = useState(true);
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [univSearch, setUnivSearch] = useState('');
  const [showUnivDropdown, setShowUnivDropdown] = useState(false);
  const [year, setYear] = useState('Grade 12');
  const [avatar, setAvatar] = useState('star');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([
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
  ]);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  
  // Supabase explicit configuration states
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(() => localStorage.getItem('ethiolearn_supabase_url') || '');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(() => localStorage.getItem('ethiolearn_supabase_key') || '');
  const [showSupaConfig, setShowSupaConfig] = useState(false);
  const [isSupaConfigured, setIsSupaConfigured] = useState(() => !!getSupabase());
  const [loading, setLoading] = useState(false);
  
  // Interface toggles
  const [showKey, setShowKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [universityError, setUniversityError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);

  // Accounts list from local state
  const [registeredAccounts, setRegisteredAccounts] = useState<AccountInfo[]>([]);

  // Generate dynamic, beautiful background stars to create a premium cinematic space
  const [starNodes] = useState(() => {
    return Array.from({ length: 35 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.5 + 0.8,
      opacity: Math.random() * 0.7 + 0.3,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * -20,
    }));
  });

  // Automatically clear errors and info messages on mode changes
  useEffect(() => {
    setAuthError(null);
    setInfoMessage(null);
    setEmailError(null);
    setPasswordError(null);
    setNameError(null);
    setUniversityError(null);
    setConfirmPasswordError(null);
  }, [mode]);
  
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

  // Fetch accounts on load
  useEffect(() => {
    async function loadConfig() {
      await initSupabaseConfig();
      setIsSupaConfigured(!!getSupabase());
      setSupabaseUrlInput(localStorage.getItem('ethiolearn_supabase_url') || '');
      setSupabaseKeyInput(localStorage.getItem('ethiolearn_supabase_key') || '');
    }
    loadConfig();

    try {
      const stored = localStorage.getItem('ethiolearn_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRegisteredAccounts(parsed);
          // Keep default mode as "splash" to allow immediate one-touch quick start
        }
      }
      
      // Load remembered login credentials if they exist to remember users on retry
      const remembered = localStorage.getItem('ethiolearn_remember_login');
      if (remembered) {
        const parsedRem = JSON.parse(remembered);
        if (parsedRem && parsedRem.email) {
          setEmail(parsedRem.email);
          setPassword(parsedRem.password || '');
          setRememberMe(parsedRem.rememberMe !== false);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      setEmail(initialProfile.email || '');
      setUniversity(initialProfile.university);
      setYear(initialProfile.year);
      setSelectedSubjects(initialProfile.subjects);
      setClaudeApiKey(initialProfile.claudeApiKey);
      if (initialProfile.avatar) {
        setAvatar(initialProfile.avatar);
      }
    }
  }, [initialProfile]);

  const handleGoogleAuth = async () => {
    try {
      setAuthError(null);
      setIsPopupBlocked(false);
      playClickChime();
      const res = await googleSignIn();
      if (res) {
        const { user } = res;
        const userEmail = user.email || '';
        const userName = user.displayName || 'Scholar';
        const emailLower = userEmail.toLowerCase();
        
        let profile: StudentProfile;
        
        // Check if connected to Supabase
        const supa = getSupabase();
        if (supa) {
          try {
            const { data: supaRecord, error: supaError } = await supa
              .from('student_profiles')
              .select('*')
              .eq('email', emailLower)
              .maybeSingle();

            if (supaRecord && supaRecord.profile_data) {
              // Found on Supabase! Load and sync
              const sp = supaRecord.profile_data;
              profile = {
                name: sp.name || userName,
                email: userEmail,
                university: sp.university || "Addis Ababa University",
                year: sp.year || "University",
                subjects: sp.subjects || [],
                claudeApiKey: sp.claudeApiKey || "",
                dailyGoalHours: sp.dailyGoalHours || 2,
                theme: sp.theme || 'dark',
                language: sp.language || 'both',
                avatar: sp.avatar || 'champion',
                isRegistered: true,
                unregisteredAICredits: sp.unregisteredAICredits || 5
              };
              
              // Push into local study sessions, notes, etc. if provided from cloud
              if (supaRecord.study_sessions) {
                localStorage.setItem('ethiolearn_study_sessions', JSON.stringify(supaRecord.study_sessions));
              }
              if (supaRecord.notes_data) {
                localStorage.setItem('ethiolearn_custom_notes', JSON.stringify(supaRecord.notes_data));
              }
              if (supaRecord.performance_data) {
                localStorage.setItem('ethiolearn_quiz_perf', JSON.stringify(supaRecord.performance_data));
              }
            } else {
              // Create brand new profile on both local & Supabase
              profile = {
                name: userName,
                email: userEmail,
                university: "Addis Ababa University",
                year: "University",
                subjects: [
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
                  "C++ Programming"
                ],
                claudeApiKey: "",
                dailyGoalHours: 2,
                theme: 'dark',
                language: 'both',
                avatar: 'champion',
                isRegistered: true,
                unregisteredAICredits: 5
              };

              const payloadRecord = {
                email: emailLower,
                profile_data: {
                  ...profile,
                  password: "google_authenticated"
                },
                study_sessions: [],
                notes_data: [],
                performance_data: {},
                updated_at: new Date().toISOString()
              };

              await supa.from('student_profiles').insert(payloadRecord);
            }
          } catch (supaEx) {
            console.warn('[Supabase Google Sync] Handled error, falling back to local:', supaEx);
            // Fallback profile if Supabase query failed
            profile = {
              name: userName,
              email: userEmail,
              university: "Addis Ababa University",
              year: "University",
              subjects: [ "Mathematics", "Geography", "History", "Chemistry" ],
              claudeApiKey: "",
              dailyGoalHours: 2,
              theme: 'dark',
              language: 'both',
              avatar: 'champion',
              isRegistered: true,
              unregisteredAICredits: 5
            };
          }
        } else {
          // If no Supabase connection is established, check if local account exists
          const found = registeredAccounts.find(
            acc => acc.email.toLowerCase() === emailLower
          );

          if (found) {
            profile = found.profile;
          } else {
            profile = {
              name: userName,
              email: userEmail,
              university: "Addis Ababa University",
              year: "University",
              subjects: [
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
                "C++ Programming"
              ],
              claudeApiKey: "",
              dailyGoalHours: 2,
              theme: 'dark',
              language: 'both',
              avatar: 'champion',
              isRegistered: true,
              unregisteredAICredits: 5
            };
          }
        }

        // Save session locally as active profile
        const newAccount: AccountInfo = {
          email: userEmail,
          passwordEncrypted: "google_authenticated",
          rememberMe: true,
          profile
        };
        
        const filteredAccounts = registeredAccounts.filter(acc => acc.email.toLowerCase() !== emailLower);
        const updated = [...filteredAccounts, newAccount];
        localStorage.setItem('ethiolearn_accounts', JSON.stringify(updated));
        localStorage.setItem('ethiolearn_active_email', userEmail);
        
        playSuccessChime();
        onComplete(profile);
      }
    } catch (err: any) {
      console.error('Google onboarding auth failed:', err);
      playFailureChime();
      if (err?.isPopupBlocked || err?.code === 'auth/popup-blocked' || err?.message?.includes('popup')) {
        setIsPopupBlocked(true);
      } else {
        setAuthError(err.message || 'Google Sign-In was canceled or encountered an issue. Please try again.');
      }
    }
  };

  const handleGoogleRedirect = async () => {
    try {
      setAuthError(null);
      setIsPopupBlocked(false);
      playClickChime();
      await googleSignInRedirect();
    } catch (err: any) {
      console.error('Google onboarding redirect failed:', err);
      setAuthError(err.message || 'Google Redirect Sign-In encountered an issue. Please try again.');
      playFailureChime();
    }
  };

  const handleSaveSupaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    playClickChime();
    if (!supabaseUrlInput.trim() || !supabaseKeyInput.trim()) {
      setAuthError("Both Supabase URL and Anon Key are required.");
      playFailureChime();
      return;
    }
    try {
      saveSupabaseCredentials(supabaseUrlInput.trim(), supabaseKeyInput.trim());
      setIsSupaConfigured(true);
      setShowSupaConfig(false);
      setAuthError(null);
      playSuccessChime();
    } catch (err: any) {
      setAuthError(`Failed to save config: ${err.message || err}`);
      playFailureChime();
    }
  };

  const renderSupabaseConfigPanel = () => {
    return (
      <div className="border border-zinc-850 bg-[#0a0a0a]/70 backdrop-blur rounded-xl p-3 space-y-3 shadow-md">
        <button
          type="button"
          onClick={() => { playClickChime(); setShowSupaConfig(!showSupaConfig); }}
          className="w-full flex items-center justify-between text-[11px] text-zinc-400 font-bold tracking-wide uppercase hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className={`w-3.5 h-3.5 ${isSupaConfigured ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
            <span>DB: {isSupaConfigured ? 'Supabase Connected' : 'Local Sandbox (Offline)'}</span>
          </div>
          <span className="text-[10px] text-amber-500 hover:underline cursor-pointer">
            {showSupaConfig ? 'Hide Config' : 'Configure Cloud Sync'}
          </span>
        </button>

        {showSupaConfig && (
          <div className="space-y-3 pt-2.5 border-t border-zinc-900 text-left">
            <p className="text-[10.5px] text-zinc-400 leading-relaxed">
              Pair your custom Supabase database to securely sync student profiles, study sessions, custom study notes, and quiz performance history across all your devices.
            </p>
            
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                Supabase URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrlInput}
                onChange={(e) => setSupabaseUrlInput(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-700 rounded px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 outline-none focus:border-amber-500 transition-all focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">
                Supabase Anon/Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKeyInput}
                onChange={(e) => setSupabaseKeyInput(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-700 rounded px-2.5 py-1.5 text-[11px] font-mono text-zinc-200 outline-none focus:border-amber-500 transition-all focus:ring-1 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveSupaConfig}
                className="px-3 py-1.5 bg-[#C8962E] hover:bg-[#b08123] text-black font-extrabold rounded text-[10.5px] transition-colors cursor-pointer"
              >
                Save Connection
              </button>
              {isSupaConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    playClickChime();
                    localStorage.removeItem('ethiolearn_supabase_url');
                    localStorage.removeItem('ethiolearn_supabase_key');
                    setSupabaseUrlInput('');
                    setSupabaseKeyInput('');
                    setIsSupaConfigured(false);
                    playSuccessChime();
                  }}
                  className="px-3 py-1.5 bg-red-950/30 border border-red-500/30 text-red-400 font-bold rounded text-[10.5px] hover:bg-red-950/50 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setEmailError(null);
    setPasswordError(null);

    const emailTrim = email.trim().toLowerCase();
    const passwordTrim = password.trim();

    let hasValidationError = false;
    if (!emailTrim) {
      setEmailError("Email address is required.");
      hasValidationError = true;
    } else if (!emailTrim.includes('@')) {
      setEmailError("Please enter a valid email address.");
      hasValidationError = true;
    }

    if (!passwordTrim) {
      setPasswordError("Password is required.");
      hasValidationError = true;
    } else if (passwordTrim.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      hasValidationError = true;
    }

    if (hasValidationError) {
      playFailureChime();
      return;
    }

    setLoading(true);

    // Lookup credentials locally
    const found = registeredAccounts.find(
      acc => acc.email.toLowerCase() === emailTrim && acc.passwordEncrypted === passwordTrim
    );

    if (!found) {
      setAuthError("Incorrect password or email. Please check your credentials.");
      playFailureChime();
      setLoading(false);
      return;
    }

    // Save rememberMe selection
    try {
      const updatedAccounts = registeredAccounts.map(acc => {
        if (acc.email.toLowerCase() === emailTrim) {
          return { ...acc, rememberMe };
        }
        return acc;
      });
      localStorage.setItem('ethiolearn_accounts', JSON.stringify(updatedAccounts));
      
      // Set active user session
      localStorage.setItem('ethiolearn_active_email', found.email);

      // Save remembered credentials if checked
      if (rememberMe) {
        localStorage.setItem('ethiolearn_remember_login', JSON.stringify({
          email: found.email,
          password: found.passwordEncrypted,
          rememberMe: true
        }));
      } else {
        localStorage.removeItem('ethiolearn_remember_login');
      }
    } catch (e) {}

    playSuccessChime();
    setLoading(false);
    
    // Pass completed profile to parent to load user session
    onComplete({ ...found.profile, isRegistered: true });
  };

  const handleQuickLogin = (acc: AccountInfo) => {
    setAuthError(null);
    playClickChime();

    if (acc.rememberMe) {
      // Direct session validation bypass if "Remember Me" is true
      try {
        localStorage.setItem('ethiolearn_active_email', acc.email);
      } catch (e) {}
      playSuccessChime();
      onComplete({ ...acc.profile, isRegistered: true });
    } else {
      // Autofill email and prompt for password
      setEmail(acc.email);
      setPassword('');
      setAuthError("Please enter your security password to login.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setInfoMessage(null);
    setNameError(null);
    setUniversityError(null);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    const nameTrim = name.trim();
    const emailTrim = email.trim().toLowerCase();
    const passwordTrim = password.trim();
    const confirmPasswordTrim = confirmPassword.trim();
    const univTrim = university.trim();

    let hasErrors = false;
    const t = onboardingTranslations[preferredLanguage];

    if (!nameTrim) {
      setNameError(t.validationName);
      hasErrors = true;
    }

    if (!univTrim) {
      setUniversityError(t.validationUniversity);
      hasErrors = true;
    }

    if (!emailTrim || !emailTrim.endsWith('@gmail.com')) {
      setEmailError(t.validationEmail);
      hasErrors = true;
    }

    if (passwordTrim.length < 5) {
      setPasswordError(t.validationPassword);
      hasErrors = true;
    }

    if (passwordTrim !== confirmPasswordTrim) {
      setConfirmPasswordError(t.validationConfirmPassword);
      hasErrors = true;
    }

    if (hasErrors) {
      playFailureChime();
      return;
    }

    setLoading(true);

    // Check pre-existing accounts locally to avoid visual duplicates
    const exists = registeredAccounts.some(acc => acc.email.toLowerCase() === emailTrim);
    if (exists) {
      setEmailError(preferredLanguage === 'am' ? "በዚህ ኢሜይል አድራሻ አስቀድሞ የተመዘገበ አካውንት አለ።" : "An academic account with this email address already exists.");
      playFailureChime();
      setLoading(false);
      return;
    }

    // Create student profile
    const profile: StudentProfile = {
      name: nameTrim,
      email: emailTrim,
      university: univTrim,
      year,
      subjects: selectedSubjects,
      claudeApiKey: claudeApiKey.trim(),
      dailyGoalHours: 2,
      theme: 'dark',
      language: preferredLanguage === 'am' ? 'am' : 'en',
      avatar,
      isRegistered: true,
      unregisteredAICredits: 5
    };

    const newAccount: AccountInfo = {
      email: emailTrim,
      passwordEncrypted: passwordTrim,
      rememberMe: rememberMe,
      profile
    };

    // Save accounts storage
    const updated = [...registeredAccounts, newAccount];
    try {
      localStorage.setItem('ethiolearn_accounts', JSON.stringify(updated));
      localStorage.setItem('ethiolearn_active_email', emailTrim);

      // Save remembered credentials if checked
      if (rememberMe) {
        localStorage.setItem('ethiolearn_remember_login', JSON.stringify({
          email: emailTrim,
          password: passwordTrim,
          rememberMe: true
        }));
      } else {
        localStorage.removeItem('ethiolearn_remember_login');
      }
    } catch (e) {}

    playSuccessChime();
    setLoading(false);
    onComplete(profile);
  };

  const handleGuestQuickStart = () => {
    playSuccessChime();
    const guestProfile: StudentProfile = {
      name: "Ethiopian Scholar",
      email: "scholar.guest@ethiolearn.com",
      university: "Addis Ababa University",
      year: "University",
      subjects: [
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
        "C++ Programming"
      ],
      claudeApiKey: "",
      dailyGoalHours: 2,
      theme: 'dark',
      language: 'both',
      avatar: 'champion',
      isRegistered: false,
      unregisteredAICredits: 5
    };
    onComplete(guestProfile);
  };

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      if (selectedSubjects.length > 1) {
        setSelectedSubjects(selectedSubjects.filter(s => s !== subject));
      }
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  return (
    <div className="fixed inset-0 bg-main-bg z-50 flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden px-4 py-8 select-none relative transition-colors duration-200">
      
      {/* Dynamic Cinematic Motion Graphics Background Canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#C8962E]/10 via-transparent to-transparent">
        {/* Floating star nodes with drifting cinematic loops */}
        {starNodes.map((star) => (
          <motion.div
            key={star.id}
            initial={{ 
              x: `${star.left}%`, 
              y: `${star.top}%`, 
              opacity: 0,
              scale: 0.5 
            }}
            animate={{ 
              y: [`${star.top}%`, `${(star.top + 8) % 100}%`, `${star.top}%`],
              opacity: [star.opacity * 0.4, star.opacity, star.opacity * 0.4],
              scale: [0.8, 1.25, 0.8]
            }}
            transition={{
              duration: star.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: star.delay
            }}
            style={{
              position: 'absolute',
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: star.id % 3 === 0 ? '#C8962E' : star.id % 3 === 1 ? '#1D4ED8' : '#e4e4e7',
              borderRadius: '50%',
              boxShadow: star.size > 2 ? `0 0 8px 1px ${star.id % 3 === 0 ? '#C8962E' : '#FFECA7'}` : 'none'
            }}
          />
        ))}

        {/* Ambient Pulsing Aura Orbs */}
        <motion.div 
          animate={{
            scale: [1, 1.15, 0.9, 1],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-[380px] h-[380px] rounded-full bg-emerald-950/20 blur-[130px]"
        />
        <motion.div 
          animate={{
            scale: [1.1, 0.9, 1.15, 1.1],
            opacity: [0.1, 0.18, 0.1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-[425px] h-[425px] rounded-full bg-amber-950/20 blur-[140px]"
        />

        {/* Traditional Geometric Habesha Bands with modern neon-wireframe style */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 via-[#C8962E] to-red-500 opacity-60" />
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 via-[#C8962E] to-red-500 opacity-60" />
      </div>

      <AnimatePresence mode="wait">
        
        {/* Step ONBOARDING */}
        {mode === 'onboarding' && (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0, scale: 0.97, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md flex flex-col items-center relative z-10 px-4"
          >
            <style>{`
              @keyframes asgobanyi-bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-4px); }
              }
              @keyframes asgobanyi-wave {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(18deg); }
              }
              @keyframes glow-pulse {
                0%, 100% { filter: drop-shadow(0 0 3px rgba(200, 150, 46, 0.4)); opacity: 0.85; }
                50% { filter: drop-shadow(0 0 10px rgba(200, 150, 46, 0.85)); opacity: 1; }
              }
              @keyframes float-slow {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-6px) rotate(2deg); }
              }
              @keyframes float-slower {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-9px) rotate(-2deg); }
              }
            `}</style>

            <div className="w-full bg-[#0a0f1d]/90 border border-zinc-800/80 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col justify-between">
              
              {/* Subtle background glow representing Ethiopian flag */}
              <div className="absolute -top-16 -left-16 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-1/2 -right-16 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header: Skip & Language Selector */}
              <div className="flex justify-between items-center w-full mb-4">
                {/* Skip top-left (hidden on step 5) */}
                {onboardingStep < 5 ? (
                  <button
                    onClick={() => { playClickChime(); setMode('signin'); }}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold text-zinc-400 hover:text-zinc-100 bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/60 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>{onboardingFlowTranslations[preferredLanguage].skip}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="w-6 h-6" /> // spacer
                )}

                {/* Bilingual Toggle top-right (always visible) */}
                <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 p-1 rounded-full backdrop-blur-md">
                  <button
                    onClick={() => { playClickChime(); setPreferredLanguage('am'); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${preferredLanguage === 'am' ? 'bg-[#C8962E] text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
                  >
                    አማ
                  </button>
                  <button
                    onClick={() => { playClickChime(); setPreferredLanguage('en'); }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer ${preferredLanguage === 'en' ? 'bg-[#C8962E] text-black shadow-md' : 'text-zinc-400 hover:text-white'}`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Dynamic Step Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={onboardingStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex-grow flex flex-col justify-center"
                >
                  
                  {/* STEP 1: Welcome */}
                  {onboardingStep === 1 && (
                    <div className="flex flex-col items-center justify-center py-4 text-center space-y-4">
                      {/* Centered Logo with pulsing glow */}
                      <div className="relative mb-2">
                        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 via-[#C8962E] to-red-500 rounded-full blur-xl opacity-25 animate-pulse" />
                        <EthioLearnLogo size={90} showCardBackground={false} className="relative transform hover:scale-105 transition-transform duration-300" />
                      </div>
                      
                      {/* Mascot አስጎብኚ waves */}
                      <div className="flex justify-center my-3">
                        <Asgobanyi action="wave" size={120} />
                      </div>
                      
                      {/* Speech Bubble */}
                      <div className="relative bg-zinc-900/90 border border-[#C8962E]/30 px-5 py-3 rounded-2xl max-w-xs text-center shadow-xl mb-2">
                        {/* Speech Bubble Arrow */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-zinc-900" />
                        <p className="text-xs font-serif font-bold text-[#F0EDE8] leading-relaxed">
                          {onboardingFlowTranslations[preferredLanguage].screen1Bubble}
                        </p>
                      </div>
                      
                      {/* Text Headings */}
                      <div className="space-y-1.5 pt-1">
                        <h1 className="font-serif text-3xl font-black text-[#C8962E] tracking-tight">
                          {onboardingFlowTranslations[preferredLanguage].screen1Headline}
                        </h1>
                        <p className="text-xs text-zinc-300 max-w-sm leading-relaxed px-2">
                          {onboardingFlowTranslations[preferredLanguage].screen1Tagline}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: AI Tutor */}
                  {onboardingStep === 2 && (
                    <div className="flex flex-col items-center py-2 space-y-4">
                      {/* Interactive Mockup for Chat */}
                      <div className="relative w-full max-w-[280px] aspect-[1.9/1] rounded-2xl bg-zinc-950/80 border border-zinc-800/80 p-3 shadow-2xl flex flex-col justify-between overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                        
                        {/* Floating Tag */}
                        <div className="flex justify-between items-center border-b border-zinc-900 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-mono uppercase tracking-wider text-zinc-500">Live AI Chat</span>
                          </div>
                          <span className="text-[8px] font-mono text-zinc-600 font-sans">Amharic / English</span>
                        </div>

                        {/* Messages list */}
                        <div className="space-y-2 py-1 flex-grow overflow-hidden flex flex-col justify-end text-left">
                          <div className="self-end bg-[#C8962E]/10 border border-[#C8962E]/20 rounded-xl px-2.5 py-1 text-[9px] text-zinc-300 max-w-[85%] font-sans">
                            {preferredLanguage === 'am' ? 'GDP በአማርኛ ምንድነው?' : 'Explain GDP in Amharic?'}
                          </div>
                          <div className="self-start bg-zinc-900 border border-zinc-850 rounded-xl px-2.5 py-1 text-[9px] text-zinc-400 max-w-[85%] flex items-start gap-1 font-sans">
                            <Sparkles className="w-2.5 h-2.5 text-[#C8962E] mt-0.5 shrink-0" />
                            <span>{preferredLanguage === 'am' ? 'ጠቅላላ የአገር ውስጥ ምርት (GDP) ማለት...' : 'Gross Domestic Product (GDP) means...'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mascot አስጎብኚ + Speech bubble side by side */}
                      <div className="flex items-center gap-3 max-w-sm bg-zinc-900/40 p-3 rounded-2xl border border-zinc-850/60 w-full">
                        <Asgobanyi action="point" size={80} className="shrink-0" />
                        <div className="relative bg-zinc-950/80 border border-[#C8962E]/30 p-2.5 rounded-xl flex-grow text-left">
                          <p className="text-[10px] text-zinc-200 leading-normal font-medium font-sans">
                            {onboardingFlowTranslations[preferredLanguage].screen2Bubble}
                          </p>
                        </div>
                      </div>

                      {/* Typography */}
                      <div className="text-center px-2 space-y-1">
                        <h2 className="text-base font-serif font-bold text-[#C8962E]">
                          {onboardingFlowTranslations[preferredLanguage].screen2Headline}
                        </h2>
                        <p className="text-[10.5px] text-zinc-400 max-w-sm leading-relaxed mx-auto font-sans">
                          {onboardingFlowTranslations[preferredLanguage].screen2Sub}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Flashcards */}
                  {onboardingStep === 3 && (
                    <div className="flex flex-col items-center py-2 space-y-4">
                      {/* 3D Flipping Flashcard Mockup */}
                      <div 
                        onClick={() => { playClickChime(); setFlashcardFlipped(!flashcardFlipped); }}
                        className="group relative w-full max-w-[280px] h-[120px] cursor-pointer"
                        style={{ perspective: '1000px' }}
                      >
                        <div 
                          className="relative w-full h-full duration-500 transition-transform"
                          style={{ 
                            transformStyle: 'preserve-3d', 
                            transform: flashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                          }}
                        >
                          {/* Front of Card */}
                          <div 
                            className="absolute inset-0 w-full h-full rounded-2xl bg-zinc-900 border-2 border-zinc-800/85 p-3.5 flex flex-col justify-between shadow-2xl"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="px-2 py-0.5 rounded-full bg-zinc-850 border border-zinc-800 text-[8px] text-[#C8962E] font-mono tracking-wider uppercase">
                                Front (ጥያቄ)
                              </span>
                              <Layers className="w-3.5 h-3.5 text-zinc-500" />
                            </div>
                            <div className="text-center py-1 text-left">
                              <p className="text-[11px] font-serif text-[#F0EDE8] font-bold">
                                What is the primary organic outcome of Photosynthesis?
                              </p>
                            </div>
                            <div className="text-center text-[8px] text-zinc-500 font-mono animate-pulse">
                              {preferredLanguage === 'am' ? 'ለመገልበጥ ንካ 🔄' : 'Click or Tap to Flip 🔄'}
                            </div>
                          </div>

                          {/* Back of Card */}
                          <div 
                            className="absolute inset-0 w-full h-full rounded-2xl bg-[#0f172a] border-2 border-[#C8962E]/60 p-3.5 flex flex-col justify-between shadow-2xl"
                            style={{ 
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)' 
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span className="px-2 py-0.5 rounded-full bg-[#C8962E]/10 border border-[#C8962E]/20 text-[8px] text-emerald-400 font-mono tracking-wider uppercase">
                                Back (መልስ)
                              </span>
                              <Sparkles className="w-3.5 h-3.5 text-[#C8962E] animate-pulse" />
                            </div>
                            <div className="text-center py-0.5">
                              <p className="text-[11px] text-zinc-300 font-medium">
                                Synthesis of glucose sugars and release of oxygen gas! 🌿
                              </p>
                            </div>
                            <div className="text-center text-[8px] text-emerald-500/70 font-bold font-mono">
                              Mastered! (+10 XP)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mascot አስጎብኚ + Speech bubble side by side */}
                      <div className="flex items-center gap-3 max-w-sm bg-zinc-900/40 p-3 rounded-2xl border border-zinc-850/60 w-full">
                        <Asgobanyi action="idle" size={80} className="shrink-0" />
                        <div className="relative bg-zinc-950/80 border border-[#C8962E]/30 p-2.5 rounded-xl flex-grow text-left">
                          <p className="text-[10px] text-zinc-200 leading-normal font-medium font-sans">
                            {onboardingFlowTranslations[preferredLanguage].screen3Bubble}
                          </p>
                        </div>
                      </div>

                      {/* Typography */}
                      <div className="text-center px-2 space-y-1">
                        <h2 className="text-base font-serif font-bold text-[#C8962E]">
                          {onboardingFlowTranslations[preferredLanguage].screen3Headline}
                        </h2>
                        <p className="text-[10.5px] text-zinc-400 max-w-sm leading-relaxed mx-auto font-sans">
                          {onboardingFlowTranslations[preferredLanguage].screen3Sub}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Universities */}
                  {onboardingStep === 4 && (
                    <div className="flex flex-col items-center py-2 space-y-4">
                      {/* University Badges Grid */}
                      <div className="relative w-full max-w-[280px] py-1.5 flex justify-center gap-2.5 overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
                        
                        {/* AAU Badge */}
                        <div className="w-[64px] h-[64px] rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-1 shadow-lg animate-[float-slow_4s_infinite_ease-in-out]">
                          <span className="text-base">🏛️</span>
                          <span className="text-[8px] font-bold text-zinc-300 font-mono mt-0.5">AAU</span>
                          <span className="text-[6px] text-zinc-500 font-mono">Addis Ababa</span>
                        </div>

                        {/* Wolkite Badge */}
                        <div className="w-[64px] h-[64px] rounded-2xl bg-zinc-900 border-2 border-[#C8962E]/40 flex flex-col items-center justify-center p-1 shadow-lg animate-[float-slower_5s_infinite_ease-in-out]">
                          <span className="text-base">🦁</span>
                          <span className="text-[8px] font-bold text-amber-300 font-mono mt-0.5">WKU</span>
                          <span className="text-[6px] text-zinc-500 font-mono">Wolkite</span>
                        </div>

                        {/* ASTU Badge */}
                        <div className="w-[64px] h-[64px] rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-1 shadow-lg animate-[float-slow_6s_infinite_ease-in-out] [animation-delay:1s]">
                          <span className="text-base">🔬</span>
                          <span className="text-[8px] font-bold text-zinc-300 font-mono mt-0.5">ASTU</span>
                          <span className="text-[6px] text-zinc-500 font-mono">Adama</span>
                        </div>
                      </div>

                      {/* Mascot አስጎብኚ + Speech bubble side by side */}
                      <div className="flex items-center gap-3 max-w-sm bg-zinc-900/40 p-3 rounded-2xl border border-zinc-850/60 w-full">
                        <Asgobanyi action="point" size={80} className="shrink-0" />
                        <div className="relative bg-zinc-950/80 border border-[#C8962E]/30 p-2.5 rounded-xl flex-grow text-left">
                          <p className="text-[10px] text-zinc-200 leading-normal font-medium font-sans">
                            {onboardingFlowTranslations[preferredLanguage].screen4Bubble}
                          </p>
                        </div>
                      </div>

                      {/* Typography */}
                      <div className="text-center px-2 space-y-1">
                        <h2 className="text-base font-serif font-bold text-[#C8962E]">
                          {onboardingFlowTranslations[preferredLanguage].screen4Headline}
                        </h2>
                        <p className="text-[10.5px] text-zinc-400 max-w-sm leading-relaxed mx-auto font-sans">
                          {onboardingFlowTranslations[preferredLanguage].screen4Sub}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Interactive Chat Preview (No Signup) */}
                  {onboardingStep === 5 && (
                    <div className="flex flex-col py-1 space-y-3">
                      {/* Chat History Container */}
                      <div className="w-full bg-zinc-950/90 border border-zinc-850 rounded-2xl p-3 shadow-inner flex flex-col justify-between overflow-hidden relative">
                        {/* Floating Backdrop Glow */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#C8962E]/5 rounded-full blur-xl pointer-events-none" />
                        
                        {/* Messages Box */}
                        <div className="h-[145px] overflow-y-auto space-y-2 pr-1 text-left flex flex-col scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                          {onboardingChatMessages.length === 0 ? (
                            <div className="my-auto text-center space-y-2.5 px-2 flex flex-col justify-center items-center">
                              <span className="text-base animate-bounce">💬</span>
                              <p className="text-[9.5px] text-zinc-400 leading-normal max-w-[220px] font-sans">
                                {preferredLanguage === 'am' ? 'ባለ ሁለት ቋንቋ ጥያቄዎችን ለመጠየቅ ከታች ካሉት አማራጮች አንዱን ይምረጡ ወይም ይፃፉ።' : 'Ask a study question to test አስጎብኚ right now!'}
                              </p>
                              
                              {/* Quick Questions */}
                              <div className="flex flex-wrap gap-1 justify-center pt-0.5">
                                <button
                                  onClick={() => handleOnboardingChatSubmit(preferredLanguage === 'am' ? "ስለ ወልቂጤ ዩኒቨርሲቲ ንገረኝ" : "Tell me about Wolkite University")}
                                  className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[8px] text-zinc-300 font-semibold transition cursor-pointer"
                                >
                                  🏫 Wolkite Univ
                                </button>
                                <button
                                  onClick={() => handleOnboardingChatSubmit(preferredLanguage === 'am' ? "ፎቶሲንተሲስ ምንድን ነው?" : "What is Photosynthesis?")}
                                  className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[8px] text-zinc-300 font-semibold transition cursor-pointer"
                                >
                                  🌿 Photosynthesis
                                </button>
                                <button
                                  onClick={() => handleOnboardingChatSubmit(preferredLanguage === 'am' ? "GDP በምሳሌ አስረዳኝ" : "Explain GDP with an example")}
                                  className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded text-[8px] text-zinc-300 font-semibold transition cursor-pointer"
                                >
                                  📊 GDP Economy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2 pb-1">
                              {onboardingChatMessages.map((msg, idx) => (
                                <div 
                                  key={idx} 
                                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                                >
                                  <div 
                                    className={`px-3 py-1.5 rounded-2xl text-[10px] max-w-[85%] leading-relaxed ${
                                      msg.role === 'user' 
                                        ? 'bg-gradient-to-r from-[#C8962E] to-amber-500 text-black font-semibold rounded-tr-none' 
                                        : 'bg-zinc-900 text-zinc-200 border border-zinc-850 rounded-tl-none font-sans'
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                </div>
                              ))}
                              {onboardingIsTyping && (
                                <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-850/50 rounded-xl px-2.5 py-1 self-start text-[9px] text-zinc-500 font-mono italic">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#C8962E]" />
                                  <span>{preferredLanguage === 'am' ? 'አስጎብኚ በማመንጨት ላይ...' : 'Asgobanyi is thinking...'}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Input form */}
                        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1 mt-1.5">
                          <input
                            type="text"
                            value={onboardingChatText}
                            onChange={(e) => setOnboardingChatText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleOnboardingChatSubmit(onboardingChatText); }}
                            placeholder={onboardingFlowTranslations[preferredLanguage].chatPlaceholder}
                            disabled={onboardingIsTyping}
                            className="flex-grow bg-transparent text-[10px] text-zinc-100 outline-none placeholder:text-zinc-600 font-sans"
                          />
                          <button
                            onClick={() => handleOnboardingChatSubmit(onboardingChatText)}
                            disabled={!onboardingChatText.trim() || onboardingIsTyping}
                            className="p-1.5 bg-[#C8962E] disabled:bg-zinc-800 text-black disabled:text-zinc-600 rounded-lg transition cursor-pointer flex items-center justify-center shrink-0"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Mascot አስጎብኚ + Speech bubble side by side */}
                      <div className="flex items-center gap-3 max-w-sm bg-zinc-900/40 p-2 rounded-2xl border border-zinc-850/60 w-full transition-all">
                        <Asgobanyi action={onboardingAiResponded ? 'thumbs-up' : 'idle'} size={75} className="shrink-0" />
                        <div className="relative bg-zinc-950/80 border border-[#C8962E]/30 p-2.5 rounded-xl flex-grow text-left">
                          <p className="text-[10px] text-zinc-200 leading-normal font-semibold font-sans">
                            {onboardingAiResponded 
                              ? onboardingFlowTranslations[preferredLanguage].screen5BubbleResponse 
                              : onboardingFlowTranslations[preferredLanguage].screen5BubbleInitial}
                          </p>
                        </div>
                      </div>

                      {/* Registration Banner & Buttons displayed once they ask a question */}
                      <AnimatePresence>
                        {onboardingAiResponded && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full text-center space-y-2 pt-0.5"
                          >
                            {/* Banner */}
                            <div className="bg-gradient-to-r from-emerald-950/20 via-amber-950/20 to-red-950/20 border border-[#C8962E]/30 p-2 rounded-xl shadow-lg">
                              <p className="text-[9px] font-medium text-zinc-300 leading-relaxed font-sans">
                                {preferredLanguage === 'am' 
                                  ? 'ተጨማሪ አገልግሎቶችን ይክፈቱ! የፈተና ጥያቄዎች፣ የመጽሃፍ መደብር፣ ብልጥ ካርዶች እና ሙሉ የትምህርት ሞጁሎች!'
                                  : 'Unlock complete focus modules, past exams, textbook library, smart decks & study counters!'}
                              </p>
                            </div>
                            
                            {/* Sign Up Button */}
                            <button
                              onClick={() => { playClickChime(); setMode('signup'); }}
                              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 via-[#C8962E] to-red-500 hover:from-emerald-400 hover:via-amber-400 hover:to-red-400 text-black font-extrabold text-[10px] tracking-widest uppercase rounded-xl cursor-pointer shadow-md transition-all flex items-center justify-center gap-1 border border-amber-300/20 font-serif"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>{onboardingFlowTranslations[preferredLanguage].createAccount}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            {/* Alternate link */}
                            <button
                              onClick={() => { playClickChime(); setMode('signin'); }}
                              className="text-[10px] text-[#C8962E] hover:underline font-bold transition cursor-pointer inline-block"
                            >
                              {onboardingFlowTranslations[preferredLanguage].loginLink}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>

              {/* Bottom Navigation Panel (Progress indicators & Buttons) */}
              {onboardingStep < 5 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-900">
                  
                  {/* Left / Back Button */}
                  {onboardingStep > 1 ? (
                    <button
                      onClick={() => { playClickChime(); setOnboardingStep(onboardingStep - 1); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>{onboardingFlowTranslations[preferredLanguage].back}</span>
                    </button>
                  ) : (
                    <div className="w-12 h-8" /> // Spacer
                  )}

                  {/* Center Progress Dots (only shown on slides 2, 3, 4 as 1/3, 2/3, 3/3) */}
                  {onboardingStep > 1 && onboardingStep < 5 ? (
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3].map((dotIdx) => {
                        const active = onboardingStep - 1 === dotIdx;
                        return (
                          <span
                            key={dotIdx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                              active ? 'w-5 bg-[#C8962E]' : 'w-1.5 bg-zinc-800'
                            }`}
                          />
                        );
                      })}
                    </div>
                  ) : onboardingStep === 1 ? (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C8962E] animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    </div>
                  ) : null}

                  {/* Right / Next Button */}
                  <button
                    onClick={() => {
                      playClickChime();
                      if (onboardingStep < 4) {
                        setOnboardingStep(onboardingStep + 1);
                      } else if (onboardingStep === 4) {
                        setOnboardingStep(5);
                      }
                    }}
                    className="px-5 py-2 bg-gradient-to-r from-[#C8962E] to-amber-500 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl hover:opacity-90 shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>
                      {onboardingStep === 1 
                        ? onboardingFlowTranslations[preferredLanguage].getStarted 
                        : onboardingStep === 4 
                          ? onboardingFlowTranslations[preferredLanguage].tryItNow 
                          : onboardingFlowTranslations[preferredLanguage].next}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-black" />
                  </button>

                </div>
              )}

              {/* Ethiopian Flag Ribbons Border */}
              <div className="h-[2.5px] bg-gradient-to-r from-emerald-500 via-[#C8962E] to-red-500 rounded-full w-2/3 mx-auto mt-4 opacity-75" />
            </div>
          </motion.div>
        )}

        {/* Step SPLASH */}
        {mode === 'splash' && (
          <motion.div
            key="splash"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="text-center max-w-lg flex flex-col items-center relative z-10 w-full my-auto px-4"
          >
            {/* Elegant Habesha Welcome Banner */}
            <div className="mb-2">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold tracking-widest text-amber-200 bg-gradient-to-r from-emerald-950/40 via-amber-950/40 to-red-950/40 border border-[#C8962E]/30 backdrop-blur-md uppercase font-serif animate-pulse">
                እንኳን በደህና መጡ!
              </span>
            </div>

            {/* Traditional 'Tibeb' styled geometric woven pattern strip */}
            <div className="w-full max-w-xs flex h-2.5 overflow-hidden rounded-full my-4 border border-zinc-800 shadow-inner select-none bg-zinc-900">
              {Array.from({ length: 16 }).map((_, i) => {
                const colors = ["bg-emerald-600", "bg-[#C8962E]", "bg-red-600"];
                return (
                  <div 
                    key={i} 
                    className={`flex-1 h-full ${colors[i % 3]} transform skew-x-12 mx-[1px]`} 
                  />
                );
              })}
            </div>

            <div className="relative w-full max-w-[320px] aspect-[4/3] mb-6 flex items-center justify-center select-none">
              {/* Vibrant Ambient Backglow representing Ethiopian National Flag Colors */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-emerald-600 via-[#C8962E] to-red-600 blur-[36px] opacity-35 animate-pulse" />

              {/* Glassmorphic Rounded Display Shield */}
              <div className="absolute inset-0 rounded-3xl bg-black/40 border border-zinc-800 backdrop-blur-md overflow-hidden shadow-2xl flex flex-col items-center justify-center px-4 py-3">
                
                {/* SVG Moving Illustration Container */}
                <svg viewBox="0 0 400 300" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    {/* Glowing Sun Gradient */}
                    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#C8962E" stopOpacity="0.4" />
                      <stop offset="60%" stopColor="#C8962E" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#C8962E" stopOpacity="0" />
                    </radialGradient>
                    
                    {/* Ethiopian Traditional Netela Borders (Green - Yellow - Red) */}
                    <linearGradient id="habeshaTrim" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10B981" /> {/* Green */}
                      <stop offset="50%" stopColor="#F59E0B" /> {/* Yellow */}
                      <stop offset="100%" stopColor="#EF4444" /> {/* Red */}
                    </linearGradient>

                    {/* Book Glow Effect */}
                    <radialGradient id="bookLight" cx="50%" cy="80%" r="50%">
                      <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#FCD34D" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 1. Golden Traditional Sunrise of Knowledge (Rotating segments in back) */}
                  <g transform="translate(200, 150)">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <line
                        key={i}
                        x1="0"
                        y1="0"
                        x2={120 * Math.cos((i * 30 * Math.PI) / 180)}
                        y2={120 * Math.sin((i * 30 * Math.PI) / 180)}
                        stroke="#C8962E"
                        strokeWidth="1.5"
                        strokeOpacity="0.15"
                        strokeDasharray="4,8"
                      />
                    ))}
                    <circle cx="0" cy="0" r="50" fill="url(#sunGlow)" />
                  </g>

                  {/* 2. Students silhouettes (Left: Boy Student, Right: Girl Student) */}
                  {/* Left Student: Boy in Traditional White Gabi/Netela */}
                  <g transform="translate(110, 140)">
                    {/* Subtle Breathing Motion */}
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="110,140; 110,137; 110,140"
                      dur="4s"
                      repeatCount="indefinite"
                      additive="sum"
                    />
                    
                    {/* Hair */}
                    <path d="M 10,-35 C -15,-35 -15,-60 10,-60 C 35,-60 35,-35 10,-35 Z" fill="#18181B" />
                    <circle cx="-2" cy="-48" r="8" fill="#18181B" />
                    <circle cx="22" cy="-48" r="8" fill="#18181B" />
                    <circle cx="10" cy="-56" r="10" fill="#18181B" />

                    {/* Left Kid Head and smiling face */}
                    <circle cx="10" cy="-35" r="18" fill="#5C4233" />
                    {/* Eyes */}
                    <circle cx="4" cy="-37" r="1.8" fill="#FFFFFF" />
                    <circle cx="4" cy="-37" r="0.8" fill="#000" />
                    <circle cx="14" cy="-37" r="1.8" fill="#FFFFFF" />
                    <circle cx="14" cy="-37" r="0.8" fill="#000" />
                    {/* Smile */}
                    <path d="M 4,-26 Q 9,-22 14,-26" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                    {/* Ears */}
                    <circle cx="-9" cy="-35" r="4" fill="#5C4233" />
                    <circle cx="29" cy="-35" r="4" fill="#5C4233" />

                    {/* Neck */}
                    <rect x="6" y="-18" width="8" height="12" fill="#5C4233" />

                    {/* Traditional Shamma / Netela (Garment shoulders) */}
                    <path d="M -25,45 C -25,10 -15,0 10,0 C 35,0 45,10 45,45 Z" fill="#F4F4F5" />
                    
                    {/* Traditional Woven Border (Green-Yellow-Red strip on clothing) */}
                    <path d="M -21,28 C -7,16 11,16 41,28" stroke="url(#habeshaTrim)" strokeWidth="5.5" fill="none" strokeLinecap="round" />
                    
                    {/* Holding Hand */}
                    <circle cx="35" cy="42" r="6" fill="#5C4233" />
                  </g>

                  {/* Right Student: Girl with braids in traditional white dress with Netela wrap */}
                  <g transform="translate(290, 140)">
                    {/* Anti-phase Breathing Motion */}
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="290,137; 290,140; 290,137"
                      dur="4s"
                      repeatCount="indefinite"
                      additive="sum"
                    />
                    
                    {/* Braids / Traditional Hair */}
                    <path d="M -10,-35 C -35,-35 -35,-60 -10,-60 C 15,-60 15,-35 -10,-35 Z" fill="#18181B" />
                    {/* Drooping Braids on sides */}
                    <path d="M -26,-40 Q -33,-20 -28,-3" stroke="#18181B" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                    <path d="M 6,-40 Q 13,-20 8,-3" stroke="#18181B" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                    
                    {/* Red hair ties at the end */}
                    <circle cx="-28" cy="-3" r="3" fill="#EF4444" />
                    <circle cx="8" cy="-3" r="3" fill="#EF4444" />

                    {/* Kid Head and smiling face */}
                    <circle cx="-10" cy="-35" r="18" fill="#6B4E3D" />
                    {/* Eyes */}
                    <circle cx="-16" cy="-37" r="1.8" fill="#FFFFFF" />
                    <circle cx="-16" cy="-37" r="0.8" fill="#000" />
                    <circle cx="-6" cy="-37" r="1.8" fill="#FFFFFF" />
                    <circle cx="-6" cy="-37" r="0.8" fill="#000" />
                    {/* Smile */}
                    <path d="M -16,-26 Q -11,-22 -6,-26" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />

                    {/* Ears */}
                    <circle cx="-29" cy="-35" r="4" fill="#6B4E3D" />
                    <circle cx="9" cy="-35" r="4" fill="#6B4E3D" />

                    {/* Neck */}
                    <rect x="-14" y="-18" width="8" height="12" fill="#6B4E3D" />

                    {/* Traditional Shamma / Dress shoulders */}
                    <path d="M -45,45 C -45,10 -35,0 -10,0 C 15,0 25,10 25,45 Z" fill="#F4F4F5" />
                    
                    {/* Traditional Woven Border (Green-Yellow-Red strip on shoulders) */}
                    <path d="M -41,28 C -11,16 7,16 21,28" stroke="url(#habeshaTrim)" strokeWidth="5.5" fill="none" strokeLinecap="round" />

                    {/* Holding Hand */}
                    <circle cx="-35" cy="42" r="6" fill="#6B4E3D" />
                  </g>

                  {/* 3. Central Open Glowing Study Book */}
                  <g transform="translate(145, 175)">
                    {/* Soft ambient book light beam upward */}
                    <polygon points="10,-60 145,-60 115,10 40,10" fill="url(#bookLight)" />

                    {/* Beautiful traditional wooden or golden book stand */}
                    <path d="M 5,28 L 30,12 L 125,12 L 150,28 Z" fill="#5F3F19" stroke="#78350F" strokeWidth="2" />
                    <path d="M 30,12 L 77,40 L 125,12" stroke="#451A03" strokeWidth="3" fill="none" />

                    {/* Animated Golden pages */}
                    <path d="M 15,15 Q 77,-5 77,15 Q 77,-5 139,15 L 129,-8 Q 77,-28 77,-8 Q 77,-28 25,-8 Z" fill="#FFFBEB" stroke="#C8962E" strokeWidth="1.5" />
                    <line x1="77" y1="-8" x2="77" y2="15" stroke="#D97706" strokeWidth="1.5" />
                    
                    {/* Glowing Star Spark coming out of book */}
                    <circle cx="77" cy="-22" r="2.5" fill="#FBBF24">
                      <animate attributeName="r" values="1;3;1" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </g>

                  {/* 4. Drifting Floating Ge'ez Alphabets (ሀ, ለ, ሐ, መ) with random animation keyframes */}
                  {/* HA (ሀ) */}
                  <g transform="translate(80, 80)">
                    <text x="0" y="0" fill="#C8962E" fontSize="24" fontFamily="serif" fontWeight="900" opacity="0.85">
                      ሀ
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,0; -10,-20; 0,0"
                        dur="6s"
                        repeatCount="indefinite"
                      />
                      <animate attributeName="opacity" values="0.4;1;0.4" dur="6s" repeatCount="indefinite" />
                    </text>
                  </g>

                  {/* LE (ለ) */}
                  <g transform="translate(310, 80)">
                    <text x="0" y="0" fill="#10B981" fontSize="22" fontFamily="serif" fontWeight="900" opacity="0.85">
                      ለ
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,0; 12,-15; 0,0"
                        dur="5s"
                        repeatCount="indefinite"
                      />
                      <animate attributeName="opacity" values="0.3;0.9;0.3" dur="5s" repeatCount="indefinite" />
                    </text>
                  </g>

                  {/* HAM (ሐ) */}
                  <g transform="translate(130, 60)">
                    <text x="0" y="0" fill="#EF4444" fontSize="20" fontFamily="serif" fontWeight="900" opacity="0.85">
                      ሐ
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,0; 5,-25; 0,0"
                        dur="7s"
                        repeatCount="indefinite"
                      />
                      <animate attributeName="opacity" values="0.2;1;0.2" dur="7s" repeatCount="indefinite" />
                    </text>
                  </g>

                  {/* MA (መ) */}
                  <g transform="translate(250, 60)">
                    <text x="0" y="0" fill="#FBBF24" fontSize="20" fontFamily="serif" fontWeight="900" opacity="0.85">
                      መ
                      <animateTransform
                        attributeName="transform"
                        type="translate"
                        values="0,0; -8,-18; 0,0"
                        dur="5.5s"
                        repeatCount="indefinite"
                      />
                      <animate attributeName="opacity" values="0.4;0.95;0.4" dur="5.5s" repeatCount="indefinite" />
                    </text>
                  </g>

                  {/* Floating sparks of wisdom (drifting up and around) */}
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const startX = 130 + idx * 26;
                    const delay = idx * 0.7;
                    return (
                      <circle
                        key={idx}
                        cx={startX}
                        cy="160"
                        r="2.5"
                        fill="#F59E0B"
                        opacity="0"
                      >
                        <animate
                          attributeName="cy"
                          values="160; 70"
                          dur="4s"
                          begin={`${delay}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="cx"
                          values={`${startX}; ${startX + (idx % 2 === 0 ? 15 : -15)}`}
                          dur="4s"
                          begin={`${delay}s`}
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0; 0.9; 0"
                          dur="4s"
                          begin={`${delay}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    );
                  })}
                </svg>

                {/* Floating Micro Label overlay */}
                <div className="absolute bottom-2.5 px-3 py-0.5 rounded-full bg-zinc-950/80 border border-zinc-900 text-[10px] text-zinc-400 font-mono tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>STUDY ROOM FRONTIER</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <h1 className="font-serif text-3xl md:text-4xl font-extrabold text-[#C8962E] tracking-normal" style={{ textShadow: "0 0 20px rgba(200, 150, 46, 0.25)" }}>
                ኢትዮ ለርን ፕሮ
              </h1>
              <h2 className="text-lg md:text-xl font-serif font-semibold text-slate-800 dark:text-[#F0EDE8] tracking-widest uppercase">
                EthioLearn Pro
              </h2>

              <div className="flex items-center justify-center gap-3 w-40 mx-auto py-1">
                <div className="h-[1px] bg-gradient-to-r from-transparent to-[#C8962E]/40 flex-1" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#C8962E]" />
                <div className="h-[1px] bg-gradient-to-l from-transparent to-emerald-500/40 flex-1" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tracking-[0.25em] uppercase">
                  ተማር • አድግ • ብልጽግና
                </p>
                <p className="text-slate-500 dark:text-[#A29A95] text-[10px] font-mono tracking-widest uppercase">
                  Learn. Grow. Prosper.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 w-full max-w-sm justify-center">
              {/* Primary Pulsing Instant Quick Start Button */}
              <motion.button
                onClick={handleGuestQuickStart}
                whileHover={{ scale: 1.025 }}
                whileTap={{ scale: 0.985 }}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-[#C8962E] to-red-500 text-black font-extrabold text-xs tracking-widest uppercase rounded-2xl cursor-pointer shadow-[0_0_24px_rgba(200,150,46,0.3)] transition-all flex items-center justify-center gap-2 border border-amber-300/30 font-serif"
              >
                <span className="relative flex h-2.5 w-2.5 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                Quick Start (አሁን ጀምር)
              </motion.button>

              {/* Smaller clean row for alternative flows */}
              <div className="flex items-center justify-center gap-6 mt-1">
                <button
                  onClick={() => { playClickChime(); setMode('signin'); }}
                  className="text-[10px] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <LogIn className="w-3 h-3 text-[#C8962E]" /> Student Sign In
                </button>
                <span className="text-slate-300 dark:text-zinc-850">|</span>
                <button
                  onClick={() => { playClickChime(); setMode('signup'); }}
                  className="text-[10px] text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-white font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3 h-3 text-[#C8962E]" /> Custom Register
                </button>
              </div>

              {/* Traditional Bottom Accents */}
              <div className="w-full max-w-[140px] flex h-[2px] overflow-hidden rounded-full mt-4 mx-auto opacity-40 select-none">
                <div className="flex-1 bg-emerald-600 h-full" />
                <div className="flex-1 bg-[#C8962E] h-full" />
                <div className="flex-1 bg-red-600 h-full" />
              </div>

              {/* Frictionless tagline */}
              <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono text-center tracking-normal mt-1 max-w-xs mx-auto">
                Instant portal to your study notes, exam prep, and audio companion.
              </p>
            </div>
          </motion.div>
        )}

        {/* Step SIGN IN */}
        {mode === 'signin' && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white dark:bg-[#1e2533] backdrop-blur-md p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-zinc-800 relative z-10 shadow-2xl space-y-6 my-auto transition-colors duration-200"
          >
            <div className="flex items-center justify-center gap-3 border-b border-slate-100 dark:border-zinc-900 pb-4">
              <EthioLearnLogo size={44} />
              <div className="text-center">
                <h3 className="font-serif text-lg font-black text-[#C8962E] tracking-tight">EthioLearn Pro</h3>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 tracking-widest uppercase font-mono">Student Portal Sign In</p>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-lg flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>{authError}</p>
              </div>
            )}

            {infoMessage && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs rounded-lg flex items-start gap-2.5">
                <span className="text-base shrink-0">✉️</span>
                <p className="font-medium">{infoMessage}</p>
              </div>
            )}

            {isPopupBlocked && (
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">⚠️</span>
                  <div>
                    <p className="font-extrabold text-amber-300 uppercase tracking-wider text-[11.5px]">Popup Window Blocked</p>
                    <p className="text-zinc-300 mt-1 leading-relaxed text-[11px]">
                      Since you are running EthioLearn inside the AI Studio Preview panel, your browser's popup blocker has blocked Google Sign-In.
                    </p>
                  </div>
                </div>
                
                <div className="pl-6 space-y-1.5 text-[10.5px] text-zinc-400">
                  <p>• <strong className="text-zinc-200">Option A:</strong> Click the <strong className="text-amber-400">"Open in new tab"</strong> icon at the top right of your preview frame to sign in cleanly.</p>
                  <p>• <strong className="text-zinc-200">Option B:</strong> Try the standard redirect sign-in flow below.</p>
                </div>

                <div className="pt-1.5 pl-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={googleSignInRedirect}
                    className="px-3 py-1.5 bg-[#C8962E] hover:bg-[#b08123] text-black font-extrabold rounded-lg text-[10.5px] transition-all cursor-pointer"
                  >
                    ⚡ Try Redirect Sign-In
                  </button>
                  <button
                    type="button"
                    onClick={() => { playClickChime(); setIsPopupBlocked(false); }}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg text-[10.5px] transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Main Sign-In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="email"
                    placeholder="e.g. student@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    className={`w-full bg-slate-50 dark:bg-zinc-900/90 border ${emailError ? 'border-red-500/80 focus:border-red-500' : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 focus:border-[#C8962E]'} rounded-lg pl-10 pr-4 py-2.5 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none text-xs transition-all focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                </div>
                {emailError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1">{emailError}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className={`w-full bg-slate-50 dark:bg-zinc-900/90 border ${passwordError ? 'border-red-500/80 focus:border-red-500' : 'border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 focus:border-[#C8962E]'} rounded-lg pl-10 pr-10 py-2.5 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none text-xs transition-all font-mono focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1">{passwordError}</p>
                )}
                
                {/* Forgot Password? Link */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      playClickChime();
                      setAuthError("To reset your password, please contact campus administrator Ezra at ezrat2116@gmail.com, or check your verification email.");
                    }}
                    className="text-[11px] text-[#C8962E] hover:underline transition-all cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Remember Me box */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">Remember session (One-click Login)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#C8962E] to-[#B08123] hover:opacity-95 text-black font-serif font-extrabold text-xs tracking-wider uppercase rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(200,150,46,0.2)]"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 text-black" />
                )}
                <span>{loading ? "Signing in..." : "Sign in"}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-zinc-600 font-bold uppercase tracking-widest font-mono">or</span>
                <div className="flex-grow border-t border-slate-100 dark:border-zinc-900"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-serif font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <span className="text-sm">🌟</span>
                <span>Sign in with Google</span>
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100 dark:border-zinc-900/60">
              <p className="text-xs text-slate-500 dark:text-zinc-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { playClickChime(); setMode('signup'); }}
                  className="text-[#C8962E] font-bold hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </div>
          </motion.div>
        )}

        {/* Step SIGN UP */}
        {mode === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg bg-[#0e1628]/95 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-zinc-800/80 relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 my-auto transition-all duration-300"
          >
            {/* Logo, Tagline & Language Toggle */}
            <div className="flex flex-col items-center justify-center text-center">
              <EthioLearnLogo size={64} className="animate-pulse drop-shadow-[0_0_12px_rgba(200,150,46,0.35)]" />
              <h3 className="font-serif text-2xl font-black bg-gradient-to-r from-[#FFECA7] via-[#D4AF37] to-[#F3E5AB] bg-clip-text text-transparent tracking-tight mt-3">
                EthioLearn Pro
              </h3>
              
              {/* Subtle Ethiopian Flag Accent line */}
              <div className="flex h-[3px] w-20 overflow-hidden rounded-full mx-auto opacity-90 mt-1.5 select-none">
                <div className="flex-1 bg-emerald-600 h-full" />
                <div className="flex-1 bg-[#C8962E] h-full" />
                <div className="flex-1 bg-red-600 h-full" />
              </div>
              
              <p className="text-[11px] text-zinc-400 font-medium tracking-normal mt-2.5 max-w-sm">
                {onboardingTranslations[preferredLanguage].tagline}
              </p>

              {/* Smooth Language Toggle Pill */}
              <div className="flex justify-center items-center p-0.5 bg-[#090f1d] border border-zinc-800/60 rounded-xl max-w-[150px] mx-auto mt-4 w-full shadow-inner">
                <button
                  type="button"
                  onClick={() => { playClickChime(); setPreferredLanguage('en'); }}
                  className={`flex-1 py-1.5 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${preferredLanguage === 'en' ? 'bg-gradient-to-r from-[#C8962E] to-[#B08123] text-black font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => { playClickChime(); setPreferredLanguage('am'); }}
                  className={`flex-1 py-1.5 text-center font-bold text-[10px] rounded-lg transition-all cursor-pointer ${preferredLanguage === 'am' ? 'bg-gradient-to-r from-[#C8962E] to-[#B08123] text-black font-extrabold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  አማርኛ
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/25 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p>{authError}</p>
              </div>
            )}

            {infoMessage && (
              <div className="p-3 bg-amber-950/25 border border-amber-500/30 text-amber-200 text-xs rounded-xl flex items-start gap-2.5">
                <span className="text-base shrink-0">✉️</span>
                <p className="font-medium">{infoMessage}</p>
              </div>
            )}

            {isPopupBlocked && (
              <div className="p-4 bg-amber-950/25 border border-amber-500/30 text-amber-200 text-xs rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">⚠️</span>
                  <div>
                    <p className="font-extrabold text-amber-300 uppercase tracking-wider text-[11.5px]">Popup Window Blocked</p>
                    <p className="text-zinc-300 mt-1 leading-relaxed text-[11px]">
                      Since you are running EthioLearn inside the AI Studio Preview panel, your browser's popup blocker has blocked Google Sign-In.
                    </p>
                  </div>
                </div>
                
                <div className="pl-6 space-y-1.5 text-[10.5px] text-zinc-400">
                  <p>• <strong className="text-zinc-200">Option A:</strong> Click the <strong className="text-amber-400">"Open in new tab"</strong> icon at the top right of your preview frame to sign in cleanly.</p>
                  <p>• <strong className="text-zinc-200">Option B:</strong> Try the standard redirect sign-in flow below.</p>
                </div>

                <div className="pt-1.5 pl-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleRedirect}
                    className="px-3.5 py-2 bg-[#C8962E] hover:bg-[#b08123] text-black font-extrabold rounded-lg text-[10.5px] transition-all cursor-pointer"
                  >
                    ⚡ Try Redirect Sign-In
                  </button>
                  <button
                    type="button"
                    onClick={() => { playClickChime(); setIsPopupBlocked(false); }}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg text-[10.5px] transition-all cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Supabase connection manager */}
            <div className="border border-zinc-800 rounded-xl p-1 bg-zinc-950/30">
              {renderSupabaseConfigPanel()}
            </div>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* Full Student Name Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {onboardingTranslations[preferredLanguage].fullName}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    placeholder={onboardingTranslations[preferredLanguage].fullNamePlaceholder}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    className={`w-full bg-[#0a0f1d] border ${nameError ? 'border-red-500/80 focus:border-red-500' : 'border-zinc-800 focus:border-[#C8962E]'} rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none text-xs transition-all focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                </div>
                {nameError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1 mt-0.5 animate-pulse">{nameError}</p>
                )}
              </div>

              {/* University drop-down with default search */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {onboardingTranslations[preferredLanguage].university}
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={onboardingTranslations[preferredLanguage].universityPlaceholder}
                    value={univSearch}
                    onFocus={() => setShowUnivDropdown(true)}
                    onBlur={() => setTimeout(() => setShowUnivDropdown(false), 250)}
                    onChange={(e) => {
                      setUnivSearch(e.target.value);
                      setUniversity(e.target.value);
                      if (universityError) setUniversityError(null);
                    }}
                    className={`w-full bg-[#0a0f1d] border ${universityError ? 'border-red-500/80 focus:border-red-500' : 'border-zinc-800 focus:border-[#C8962E]'} rounded-lg pl-10 pr-10 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none text-xs transition-all focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowUnivDropdown(!showUnivDropdown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <span className="text-[10px]">▼</span>
                  </button>
                </div>
                {universityError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1 mt-0.5 animate-pulse">{universityError}</p>
                )}

                {showUnivDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#090f1d] border border-zinc-800 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-zinc-900 scrollbar-thin scrollbar-thumb-zinc-800">
                    {ETHIOPIAN_UNIVERSITIES.filter(univ =>
                      univ.toLowerCase().includes(univSearch.toLowerCase())
                    ).map((univ) => (
                      <button
                        key={univ}
                        type="button"
                        onMouseDown={() => {
                          setUniversity(univ);
                          setUnivSearch(univ);
                          setShowUnivDropdown(false);
                          if (universityError) setUniversityError(null);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-[11px] text-zinc-300 hover:bg-[#1e293b] hover:text-white transition-all font-medium block truncate cursor-pointer"
                      >
                        {univ}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {onboardingTranslations[preferredLanguage].email}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="email"
                    placeholder={onboardingTranslations[preferredLanguage].emailPlaceholder}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    className={`w-full bg-[#0a0f1d] border ${emailError ? 'border-red-500/80 focus:border-red-500' : 'border-zinc-800 focus:border-[#C8962E]'} rounded-lg pl-10 pr-4 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none text-xs transition-all focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                </div>
                {emailError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1 mt-0.5 animate-pulse">{emailError}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {onboardingTranslations[preferredLanguage].password}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={onboardingTranslations[preferredLanguage].passwordPlaceholder}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                    }}
                    className={`w-full bg-[#0a0f1d] border ${passwordError ? 'border-red-500/80 focus:border-red-500' : 'border-zinc-800 focus:border-[#C8962E]'} rounded-lg pl-10 pr-10 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none text-xs transition-all font-mono focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1 mt-0.5 animate-pulse">{passwordError}</p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {onboardingTranslations[preferredLanguage].confirmPassword}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={onboardingTranslations[preferredLanguage].confirmPasswordPlaceholder}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError(null);
                    }}
                    className={`w-full bg-[#0a0f1d] border ${confirmPasswordError ? 'border-red-500/80 focus:border-red-500' : 'border-zinc-800 focus:border-[#C8962E]'} rounded-lg pl-10 pr-10 py-2.5 text-zinc-100 placeholder-zinc-500 outline-none text-xs transition-all font-mono focus:ring-1 focus:ring-[#C8962E]/20`}
                  />
                </div>
                {confirmPasswordError && (
                  <p className="text-[11px] text-red-500 font-medium pl-1 mt-0.5 animate-pulse">{confirmPasswordError}</p>
                )}
              </div>

              {/* Remember session Option */}
              <div className="flex items-center justify-between py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-800 bg-[#0a0f1d] text-[#C8962E] focus:ring-0 cursor-pointer w-3.5 h-3.5"
                  />
                  <span className="text-[11px] text-slate-400">{onboardingTranslations[preferredLanguage].rememberSession}</span>
                </label>
              </div>

              {/* Create Account Gold Gradient Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#C8962E] via-[#D4AF37] to-[#B08123] hover:brightness-105 active:scale-[0.99] text-black font-serif font-extrabold text-xs tracking-widest uppercase rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(200,150,46,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 text-black" />
                )}
                <span>{loading ? onboardingTranslations[preferredLanguage].loading : onboardingTranslations[preferredLanguage].createAccountBtn}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-zinc-900"></div>
                <span className="flex-shrink mx-4 text-[9px] text-zinc-600 font-bold uppercase tracking-widest font-mono">or</span>
                <div className="flex-grow border-t border-zinc-900"></div>
              </div>

              {/* Google Integration */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                className="w-full py-3 bg-[#0a0f1d] hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl text-xs font-serif font-bold tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <span className="text-sm">🌟</span>
                <span>{onboardingTranslations[preferredLanguage].googleRegisterBtn}</span>
              </button>

            </form>

            {/* Login Link at the Bottom */}
            <div className="text-center pt-4 border-t border-zinc-900">
              <p className="text-xs text-slate-400 font-medium">
                {onboardingTranslations[preferredLanguage].alreadyHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => { playClickChime(); setMode('signin'); }}
                  className="text-[#C8962E] font-bold hover:underline cursor-pointer ml-1"
                >
                  {onboardingTranslations[preferredLanguage].loginLink}
                </button>
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
