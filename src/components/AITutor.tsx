import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Send, Mic, RefreshCw, Copy, Check, MessageSquare, Sparkles, AlertCircle, HelpCircle, FileText,
  Paperclip, File, X, Languages, Volume2, VolumeX, BookOpen, GraduationCap, CheckCircle2,
  Lightbulb, HelpCircle as QuestionIcon, ArrowRight
} from 'lucide-react';
import { ChatMessage, submitClaudeChat, generateQuizAI, generateFlashcardsFromContextAI } from '../utils/ai';
import { playClickChime, playSuccessChime, playFailureChime } from '../utils/audio';
import AITutorLogo from './AITutorLogo';
import { StudentProfile, Flashcard, AITeacherContext } from '../types';
import { safeStorage } from '../utils/safeStorage';
import PaywallModal from './PaywallModal';
import AIStudyToolsModal from './AIStudyToolsModal';
import { getDailyAIUsageCount, incrementDailyAIUsage, checkSubscriptionStatus, FREE_DAILY_AI_LIMIT } from '../utils/monetization';

interface AITutorProps {
  apiKey: string;
  enrolledSubjects: string[];
  decksState?: { [deckId: string]: Flashcard[] };
  onSaveDecksState?: (deckId: string, cards: Flashcard[]) => void;
  onStudyAction?: () => void;
  profile: StudentProfile;
  onUpdateProfile: (updated: StudentProfile) => void;
  onOpenUpgrade?: () => void;
  context?: AITeacherContext | null;
  onClearContext?: () => void;
}

const LOCAL_FALLBACK_QUIZ: { [subject: string]: any[] } = {
  "Emerging Technologies": [
    {
      question: "Which of the following is the best definition of IoT (Internet of Things)?",
      options: [
        "A network of physical objects embedded with sensors and software to exchange data over the internet.",
        "A search engine used for looking up academic textbook summaries online.",
        "A type of security protocol for central bank transactions.",
        "A private server cluster designed for hosting high-speed gaming systems."
      ],
      correctAnswer: "A network of physical objects embedded with sensors and software to exchange data over the internet.",
      explanation: "IoT connects physical devices to collect, transmit, and act on local data automatically."
    },
    {
      question: "What distinguishes Edge Computing from conventional cloud computing?",
      options: [
        "Data is processed at the network edge, closer to the source device.",
        "It consumes infinitely more internet data bandwidth.",
        "It replaces the need for any storage physical drives.",
        "It strictly prevents any wireless connections for device security."
      ],
      correctAnswer: "Data is processed at the network edge, closer to the source device.",
      explanation: "Edge computing keeps data processing close to the collection source, saving response time and bandwidth."
    }
  ],
  "Introduction to Economics": [
    {
      question: "Which term describes the total monetary value of all finished goods and services produced within a country's borders in a specific period?",
      options: [
        "Gross Domestic Product (GDP)",
        "Consumer Price Index (CPI)",
        "Aggregate Inflation Scale",
        "Giffen Marginal Utility"
      ],
      correctAnswer: "Gross Domestic Product (GDP)",
      explanation: "GDP is the standard macro-economic metric used to measure the official production output of an economy."
    }
  ],
  "General Biology": [
    {
      question: "What is the primary organic outcome of Photosynthesis in green plants?",
      options: [
        "Synthesis of glucose sugars and release of oxygen gas",
        "Production of carbon dioxide and water molecules",
        "Metabolism of lipid membranes in root tissues",
        "Direct replication of nuclear chromatin structures"
      ],
      correctAnswer: "Synthesis of glucose sugars and release of oxygen gas",
      explanation: "Chloroplasts capture sunlight to transform carbon dioxide and water into glucose and oxygen."
    }
  ],
  "Communicative English": [
    {
      question: "Which option correctly uses reported speech for: 'The examination is tomorrow,' told the tutor.",
      options: [
        "The tutor said that the examination was the next day.",
        "The tutor says the examination is tomorrow.",
        "The tutor told me that tomorrow is exam day.",
        "The tutor has been saying the examination was tomorrow."
      ],
      correctAnswer: "The tutor said that the examination was the next day.",
      explanation: "'Is' shifts to 'was' in reported speech, and 'tomorrow' shifts to 'the next day'."
    }
  ],
  "Moral and Civic Education": [
    {
      question: "Which of the following is core to the constitutional system and rule of law?",
      options: [
        "Respect for human and democratic rights and sovereignty of citizens",
        "Unchecked authority of a centralized monarch",
        "Exclusive priority of private corporate legal systems",
        "Restricting public speech and citizen representation"
      ],
      correctAnswer: "Respect for human and democratic rights and sovereignty of citizens",
      explanation: "Modern democratic constitutions ensure sovereignty belongs to the citizens, protected by rigorous checks and balances."
    }
  ],
  "Mathematics": [
    {
      question: "What is the derivative of f(x) = 3x^2 + 5x - 7 with respect to x?",
      options: [
        "6x + 5",
        "3x + 5",
        "6x^2 + 5",
        "6x"
      ],
      correctAnswer: "6x + 5",
      explanation: "By the power rule, the derivative of 3x^2 is 6x, and the derivative of 5x is 5. The derivative of a constant (-7) is 0."
    }
  ],
  "Inclusive Education": [
    {
      question: "Which of the following best describes the core philosophy of Inclusive Education?",
      options: [
        "Separating children with disabilities into special schools",
        "Providing equitable learning opportunities for all students regardless of diverse needs",
        "Only teaching high-achieving academic students",
        "Using a single uniform teaching method for everyone"
      ],
      correctAnswer: "Providing equitable learning opportunities for all students regardless of diverse needs",
      explanation: "Inclusive education aims to remove learning barriers so that all students learn together in a supportive environment."
    }
  ],
  "Geography": [
    {
      question: "Which major Ethiopian river basin accounts for the largest share of the country's annual surface water runoff?",
      options: [
        "The Abbay (Blue Nile) Basin",
        "The Awash River Basin",
        "The Omo-Gibe Basin",
        "The Wabi Shebelle Basin"
      ],
      correctAnswer: "The Abbay (Blue Nile) Basin",
      explanation: "The Blue Nile (Abbay) Basin is Ethiopia's largest river basin by runoff volume, contributing significantly to national and regional water resources."
    }
  ],
  "Logic and Critical Thinking": [
    {
      question: "Which logical fallacy occurs when an opponent's argument is misrepresented or exaggerated to make it easier to attack?",
      options: [
        "Ad Hominem",
        "Straw Man Fallacy",
        "Slippery Slope",
        "Begging the Question"
      ],
      correctAnswer: "Straw Man Fallacy",
      explanation: "A Straw Man fallacy involves oversimplifying, misrepresenting, or inventing an opponent's argument to easily knock it down."
    }
  ],
  "History": [
    {
      question: "Which historic 1896 battle secured Ethiopia's sovereignty against Italian colonial forces?",
      options: [
        "Battle of Adwa",
        "Battle of Maichew",
        "Battle of Gundet",
        "Battle of Gura"
      ],
      correctAnswer: "Battle of Adwa",
      explanation: "The Battle of Adwa on March 1, 1896 was a decisive victory for Ethiopian forces under Emperor Menelik II, preserving the nation's independence."
    }
  ],
  "Chemistry": [
    {
      question: "What type of chemical bond is formed when two atoms share electrons equally?",
      options: [
        "Ionic bond",
        "Covalent bond",
        "Hydrogen bond",
        "Metallic bond"
      ],
      correctAnswer: "Covalent bond",
      explanation: "Covalent bonds are characterized by the sharing of pairs of electrons between atoms, typically non-metals."
    }
  ],
  "Aptitude": [
    {
      question: "If a car travels 180 kilometers in 3 hours, what is its average speed in meters per second?",
      options: [
        "16.67 m/s",
        "20 m/s",
        "60 m/s",
        "15 m/s"
      ],
      correctAnswer: "16.67 m/s",
      explanation: "180 km in 3 hours is 60 km/h. To convert km/h to m/s, divide by 3.6: 60 / 3.6 = 16.67 m/s."
    }
  ],
  "General Physics": [
    {
      question: "According to Newton's Second Law of Motion, what is the relationship between Force (F), Mass (m), and Acceleration (a)?",
      options: [
        "F = m * a",
        "F = m / a",
        "F = m + a",
        "F = a / m"
      ],
      correctAnswer: "F = m * a",
      explanation: "Newton's Second Law states that force is directly proportional to the product of mass and acceleration."
    }
  ],
  "Entrepreneurship": [
    {
      question: "What document outlines a startup's operational plans, market analysis, financial projections, and value proposition?",
      options: [
        "A corporate tax return",
        "A business plan",
        "A stock certificate",
        "A bank statement"
      ],
      correctAnswer: "A business plan",
      explanation: "A business plan acts as a roadmap for an entrepreneur, detailing the strategy to launch, grow, and fund a business venture."
    }
  ],
  "Social Anthropology": [
    {
      question: "Which anthropological concept describes the practice of viewing and analyzing a culture through its own lens rather than judging it by one's own cultural standards?",
      options: [
        "Ethnocentrism",
        "Cultural Relativism",
        "Assimilation",
        "Acculturation"
      ],
      correctAnswer: "Cultural Relativism",
      explanation: "Cultural relativism promotes understanding cultural practices within their own context, suspending external moral judgments."
    }
  ],
  "C++ Programming": [
    {
      question: "Which of the following is the correct syntax to declare a dynamic array of integers in C++?",
      options: [
        "int* arr = new int[size];",
        "int arr = new int(size);",
        "new int arr[size];",
        "int arr[] = new array(size);"
      ],
      correctAnswer: "int* arr = new int[size];",
      explanation: "In C++, dynamic memory allocation for arrays uses the 'new' operator with square brackets, returning a pointer to the first element."
    }
  ]
};

type AIMode = 'teaching' | 'quiz' | 'exam_feedback' | 'chat';

export default function AITutor({ 
  apiKey, 
  enrolledSubjects = [], 
  decksState, 
  onSaveDecksState, 
  onStudyAction,
  profile,
  onUpdateProfile,
  onOpenUpgrade,
  context,
  onClearContext
}: AITutorProps) {
  const [selectedSubject, setSelectedSubject] = useState(
    context?.subject || (enrolledSubjects && enrolledSubjects[0]) || "Emerging Technologies"
  );
  const [activeMode, setActiveMode] = useState<AIMode>(context?.mode || 'teaching');
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isStudyToolsOpen, setIsStudyToolsOpen] = useState(false);
  
  // Persistent language mapping
  const [language, setLanguage] = useState<'en' | 'am'>(() => {
    const saved = safeStorage.getItem('ethiolearn_language_preference');
    return (saved === 'am' || saved === 'en') ? saved : 'en';
  });

  const [highThinking, setHighThinking] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  
  // File Upload Systems
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    mimeType: string;
    data: string; // raw base64 string
    previewUrl?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Suggestions list
  const suggestedQuestions = [
    { label: language === 'en' ? "Explain this simply" : "በቀላሉ አስረዳኝ", value: "Explain this core concept in simple terms with a real-world analogy." },
    { label: language === 'en' ? "Test my understanding" : "እውቀቴን ፈትሽ", value: "Ask me a practice question to test if I really understand this topic." },
    { label: language === 'en' ? "Give Ethiopian exam example" : "የፈተና ምሳሌ ስጠኝ", value: "Give me an authentic university/Grade 12 exam-level question on this topic." }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    const MAX_SIZE = 4 * 1024 * 1024; // 4MB
    if (file.size > MAX_SIZE) {
      setErrorBanner(
        language === 'en' 
          ? "Your file is too large (Maximum size is 4MB). Please attach a smaller file."
          : "ፋይሉ በጣም ትልቅ ነው። ከፍተኛው መጠን 4 ሜጋባይት ነው።"
      );
      playFailureChime();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      const base64Data = commaIdx !== -1 ? result.substring(commaIdx + 1) : result;
      
      const fileObj = {
        name: file.name,
        mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
        data: base64Data,
        previewUrl: file.type.startsWith('image/') ? result : undefined
      };
      
      setAttachedFile(fileObj);
      setErrorBanner(null);
      playSuccessChime();
    };
    reader.onerror = () => {
      setErrorBanner(
        language === 'en' 
          ? "Could not read the file. Please try another one."
          : "ፋይሉን ማንበብ አልተቻለም። እባኮትን በድጋሚ ይሞክሩ።"
      );
      playFailureChime();
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Quiz states
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ [qIndex: number]: string }>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [isGeneratingFl, setIsGeneratingFl] = useState(false);
  const [flSuccess, setFlSuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const quickChips: { [subject: string]: string[] } = {
    "Emerging Technologies": ["What is IoT?", "Explain Edge Computing vs Cloud", "What are Smart Cities?", "Explain AI ethics"],
    "Introduction to Economics": ["Supply and demand example", "Explain GDP formula", "What is Giffen Good?", "Why inflation happens"],
    "General Biology": ["Explain photosynthesis", "Lock and key enzyme model", "Mitosis vs Meiosis differences", "Explain Krebs Cycle"],
    "Communicative English": ["Reported speech rules", "Third conditional structure", "Active vs passive voice", "Used to vs Get used to"],
    "Moral and Civic Education": ["Ethiopian constitution pillars", "Human rights categories", "Federalism system", "Deontology vs Utilitarianism"],
    "Mathematics": ["Derivative power rule", "Solve quadratic formula", "Explain limits conceptually", "What is Euler's number?"],
    "Inclusive Education": ["Differentiated instruction", "Special needs accommodations", "Universal Design for Learning", "Philosophy of inclusion"],
    "Geography": ["Ethiopia rift valley lakes", "Climatic zones of Ethiopia", "What is absolute location?", "Explain river basins"],
    "Logic and Critical Thinking": ["Identify Straw Man fallacy", "Deductive vs Inductive reasoning", "Validity vs Soundness", "Syllogism definition"],
    "History": ["Causes of Battle of Adwa", "Axumite civilization achievements", "Lalibela rock-hewn churches", "The Tripartite Treaty of 1906"],
    "Chemistry": ["Balancing redox equations", "Periodic table trends", "Le Chatelier's principle", "Ideal gas law calculation"],
    "Aptitude": ["Logical reasoning patterns", "Work and time problems", "Percentage calculation tips", "Data interpretation help"],
    "General Physics": ["Newton's laws explained", "Conservation of energy", "Electric potential difference", "Wave-particle duality"],
    "Entrepreneurship": ["Design a business model", "Value proposition canvas", "Startup funding stages", "Market research methods"],
    "Social Anthropology": ["What is cultural relativism?", "Define kinship structures", "Qualitative research methods", "Ethnographic fieldwork study"],
    "C++ Programming": ["Explain pointers & references", "Object-Oriented programming in C++", "Memory allocation (new/delete)", "C++ vector class guide"]
  };

  const getSystemPrompt = () => {
    let modeInstruction = "";
    if (activeMode === 'teaching') {
      modeInstruction = `MODE: SOCRATIC TEACHER ("አስተማሪ")
- Your goal is to guide the student to master concepts step-by-step.
- Break complex ideas into intuitive chunks. Use analogies from Ethiopian life, geography, or daily reality (e.g. coffee ceremony preparation, injera fermentation, rural-urban transport, hydro dams like GERD).
- After explaining a key point, ALWAYS ask one targeted check-for-understanding question to see if the student followed.`;
    } else if (activeMode === 'quiz') {
      modeInstruction = `MODE: PRACTICE EXAM CREATOR ("ፈተና አዘጋጅ")
- Generate authentic multiple-choice practice questions mirroring Ethiopian university and Grade 12 national exam formats.
- When the student replies with an answer, immediately grade it, explain WHY the correct option is right, and explain why the other options are distractors.`;
    } else if (activeMode === 'exam_feedback') {
      modeInstruction = `MODE: EXAM MISTAKE REMEDIATION ("ስህተት መመርመሪያ")
- The student is reviewing an exam question they missed or struggled with.
- Pinpoint the exact conceptual misconception that led to the wrong choice.
- Teach the core rule clearly and give a quick mnemonic or memory tip so they will never miss this concept again on official exams.`;
    } else {
      modeInstruction = `MODE: COLLABORATIVE STUDY BUDDY ("አስጎብኚ ውይይት")
- Friendly, direct Q&A, math step-by-step problem solver, and summarizer.`;
    }

    const contextDetails = context ? `
ACTIVE COURSE CONTEXT:
- Course: ${context.courseTitle || selectedSubject}
- Current Lesson: ${context.lessonTitle || 'General Unit'}
${context.lessonContent ? `- Lesson Summary/Content Excerpt:\n${context.lessonContent.slice(0, 1500)}` : ''}
` : '';

    return `You are EthioLearn Pro's AI Master Teacher ("አስጎብኚ") — a warm, highly pedagogical academic mentor for Ethiopian students.
${modeInstruction}

CRITICAL RULES:
1. Always respond in the SAME language the student uses (Amharic if they write Amharic, English if they write English).
2. Maintain high academic rigor while remaining encouraging, patient, and clear.
3. Structure your response with clean Markdown headers, bold highlights, and bullet points.

Subject: ${context?.subject || selectedSubject}
Preferred language: ${language === 'am' ? 'Amharic (አማርኛ)' : 'English'}
${contextDetails}`;
  };

  // Sync context changes
  useEffect(() => {
    if (context) {
      if (context.subject) setSelectedSubject(context.subject);
      if (context.mode) setActiveMode(context.mode);

      // Create a contextual opening greeting
      const subjectName = context.subject || selectedSubject;
      const lessonName = context.lessonTitle || (language === 'en' ? 'this lesson' : 'ይህንን ትምህርት');
      let greeting = "";

      if (context.mode === 'teaching') {
        greeting = language === 'en'
          ? `Welcome! I am your AI Teacher for **${context.courseTitle || subjectName}**.\n\nWe are focusing on: **${lessonName}**.\n\nWould you like a step-by-step concept breakdown, or would you like to ask a specific question about this topic?`
          : `እንኳን ደህና መጡ! እኔ ለ**${context.courseTitle || subjectName}** የአይ መምህርዎ ነኝ።\n\nየትኩረት ትምህርታችን፡ **${lessonName}** ነው።\n\nከየት እንጀምር? የትምህርቱን ዋና ዋና ነጥቦች ደረጃ በደረጃ ላስረዳዎት ወይስ የተለየ ጥያቄ አለዎት?`;
      } else if (context.mode === 'quiz') {
        greeting = language === 'en'
          ? `Ready for a quick knowledge check on **${lessonName}**? I will generate authentic exam questions for you to practice. Reply 'Ready' whenever you want your first question!`
          : `ስለ **${lessonName}** እውቀትዎን ለመፈተሽ ዝግጁ ነዎት? ተዘጋጅቻለሁ ብለው ይጻፉልኝ እና የመጀመሪያውን ጥያቄ አቀርባለሁ!`;
      } else if (context.mode === 'exam_feedback') {
        greeting = language === 'en'
          ? `Exam Mistake Remediation Mode activated for **${lessonName}**.\n\nPaste the question or concept you found challenging, and I will diagnose the mistake step-by-step!`
          : `የፈተና ስህተት መመርመሪያ ክፍል ነቅቷል።\n\nያስቸገረዎትን ጥያቄ ወይም ጽንሰ-ሀሳብ ያጋሩኝ እና ዋናውን ምክንያት ደረጃ በደረጃ እንመርምረው!`;
      } else {
        greeting = language === 'en'
          ? `Greetings! I am your study buddy for **${lessonName}**. What would you like to explore today?`
          : `ጤና ይስጥልኝ! ለ**${lessonName}** የጥናት ረዳትዎ ነኝ። ዛሬ ምን እንወያይ?`;
      }

      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [context, language]);

  useEffect(() => {
    safeStorage.setItem('ethiolearn_language_preference', language);
  }, [language]);

  useEffect(() => {
    if (!context) {
      const saved = safeStorage.getItem(`ethiolearn_chat_history_${selectedSubject}`);
      if (saved) {
        setMessages(JSON.parse(saved).slice(-50));
      } else {
        const introText = language === 'en' 
          ? `Greetings. I am your AI Academic Tutor for *${selectedSubject}*. Please ask any question, attach your study materials, or click "Generate Quiz" to challenge your knowledge.`
          : `ጤና ይስጥልኝ። እኔ ለ*${selectedSubject}* የትምህርት ረዳትዎ ነኝ። ማንኛውንም ጥያቄ ይጠይቁኝ፣ የጥናት መረጃዎችን ያያይዙ ወይም ራስዎን ለመፈተን "ፈተናዎች" የሚለውን ይጫኑ።`;
        setMessages([{ role: 'assistant', content: introText }]);
      }
    }
  }, [selectedSubject, language, context]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const speakText = (text: string, idx: number) => {
    if ('speechSynthesis' in window) {
      if (speakingMsgIdx === idx) {
        window.speechSynthesis.cancel();
        setSpeakingMsgIdx(null);
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = language === 'am' ? 'am-ET' : 'en-US';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingMsgIdx(null);
      utterance.onerror = () => setSpeakingMsgIdx(null);
      setSpeakingMsgIdx(idx);
      window.speechSynthesis.speak(utterance);
    }
  };

  const saveHistory = (mList: ChatMessage[]) => {
    if (context) return; // Don't overwrite general subject history with transient lesson context
    try {
      const slimmedList = mList.map((m, idx) => {
        if (m.attachment && idx < mList.length - 4) {
          return { ...m, attachment: { ...m.attachment, data: '' } };
        }
        return m;
      });
      safeStorage.setItem(`ethiolearn_chat_history_${selectedSubject}`, JSON.stringify(slimmedList.slice(-50)));
    } catch (e) {
      console.warn("Local storage quota limit exceeded:", e);
    }
  };

  const clearHistory = () => {
    playClickChime();
    if (speakingMsgIdx !== null && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIdx(null);
    }
    const introText = language === 'en' 
        ? `Chat history reset. Let's start fresh with our study of *${selectedSubject}*!`
        : `የውይይት መዝገብ ተሰርዟል። ስለ *${selectedSubject}* እንደገና መማር እንጀምር!`;
    setMessages([{ role: 'assistant', content: introText }]);
    if (!context) {
      safeStorage.removeItem(`ethiolearn_chat_history_${selectedSubject}`);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() && !attachedFile) return;

    const subInfo = checkSubscriptionStatus(profile);
    const userId = profile.email || profile.name || 'guest';
    const usedToday = getDailyAIUsageCount(userId);

    // Gating check: If not PRO and reached daily 5 question limit
    if (!subInfo.isPro && usedToday >= FREE_DAILY_AI_LIMIT) {
      playFailureChime();
      setIsPaywallOpen(true);
      return;
    }

    // Increment daily usage count for free tier users
    if (!subInfo.isPro) {
      incrementDailyAIUsage(userId);
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      attachment: attachedFile ? {
        name: attachedFile.name,
        mimeType: attachedFile.mimeType,
        data: attachedFile.data
      } : undefined
    };

    const updatedUserMessages = [...messages, userMsg];
    setMessages(updatedUserMessages);
    setInputValue('');
    setAttachedFile(null);
    setErrorBanner(null);
    setIsTyping(true);
    playClickChime();
    onStudyAction?.();

    let assistantMessageIndex = updatedUserMessages.length;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    await submitClaudeChat(
      updatedUserMessages.slice(-10),
      getSystemPrompt(),
      apiKey,
      {
        onChunk: (chunk) => {
          setMessages(prev => {
            const copy = [...prev];
            if (copy[assistantMessageIndex]) {
              copy[assistantMessageIndex].content += chunk;
            }
            return copy;
          });
        },
        onComplete: (fullText) => {
          setIsTyping(false);
          setMessages(prev => {
            const copy = [...prev];
            copy[assistantMessageIndex].content = fullText;
            saveHistory(copy);
            return copy;
          });
        },
        onError: (err) => {
          setIsTyping(false);
          setErrorBanner(
            language === 'en'
              ? `AI service error: ${err}. Please check your internet connection or API setup.`
              : `የአይ አገልግሎት ስህተት ገጥሞታል፡ ${err}። እባኮትን ግንኙነትዎን ይፈትሹ።`
          );
          playFailureChime();
          setMessages(prev => prev.slice(0, -1));
        }
      },
      highThinking
    );
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorBanner("Voice input features are not fully supported in your browser.");
      return;
    }

    playClickChime();
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'am' ? 'am-ET' : 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    setListening(true);

    recognition.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setInputValue(resultText);
      setListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error(event);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  };

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    playSuccessChime();
    setTimeout(() => setCopiedIndex(null), 3000);
  };

  const triggerQuizGeneration = async () => {
    setGeneratingQuiz(true);
    setCurrentQuiz(null);
    setQuizAnswers({});
    setQuizScore(null);
    playClickChime();

    try {
      const topic = quickChips[selectedSubject][0];
      const quiz = await generateQuizAI(topic, selectedSubject, apiKey);
      if (quiz && quiz.length > 0) {
        setCurrentQuiz(quiz);
        setGeneratingQuiz(false);
        playSuccessChime();
      } else {
        throw new Error("Empty quiz response from AI");
      }
    } catch (err: any) {
      console.warn("AI generation failed in AITutor, using offline fallback quiz:", err);
      // Retrieve subject specific fallback quiz list or default
      const fallbackList = LOCAL_FALLBACK_QUIZ[selectedSubject] || LOCAL_FALLBACK_QUIZ["Emerging Technologies"];
      setCurrentQuiz(fallbackList);
      setGeneratingQuiz(false);
      playSuccessChime();
      setErrorBanner(
        language === 'en'
          ? "AI was offline or slow. Loaded official practice sheets from local library instead."
          : "አይ መምህሩ ከመስመር ውጭ በመሆኑ ምክንያት ጥያቄዎችን ከመካነ-መዝገቡ አምጥተናቸዋል::"
      );
      setTimeout(() => setErrorBanner(null), 5000);
    }
  };

  const submitQuizAnswers = () => {
    if (!currentQuiz) return;
    let score = 0;
    currentQuiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    setQuizScore(score);
    playSuccessChime();
  };

  return (
    <div 
      className="flex flex-col flex-1 min-h-0 relative bg-slate-900/90 h-full p-3 md:p-5 rounded-2xl border border-slate-800 shadow-md"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*,application/pdf" 
        className="hidden" 
      />

      {/* TOP HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-3 shadow-sm text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 overflow-hidden">
            <AITutorLogo size={36} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-base font-bold text-white leading-tight">
                {language === 'en' ? 'AI Master Teacher' : 'የአይ መምህርና አስጎብኚ'}
              </h2>
              {profile.isRegistered ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded font-sans">
                  PRO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded font-sans">
                  {profile.unregisteredAICredits !== undefined ? profile.unregisteredAICredits : 5}/5
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {language === 'en' ? 'Context-Aware Ethiopian University & Grade 12 Mentor' : 'የትምህርት መመሪያ ረዳት'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Subject choosing */}
          <select
            value={selectedSubject}
            onChange={(e) => { setSelectedSubject(e.target.value); playClickChime(); }}
            className="bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 py-2 px-3 outline-none cursor-pointer focus:border-amber-500 shrink-0"
          >
            {enrolledSubjects.map(sub => (
              <option key={sub} value={sub} className="bg-slate-900 text-slate-200">{sub}</option>
            ))}
          </select>

          {/* Bilingual Language Selector */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => { setLanguage('en'); playClickChime(); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                language === 'en' 
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              EN 🇺🇸
            </button>
            <button
              onClick={() => { setLanguage('am'); playClickChime(); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                language === 'am' 
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              አማ 🇪🇹
            </button>
          </div>

          {/* Brain High Thinking Toggle */}
          <button
            onClick={() => { setHighThinking(!highThinking); playClickChime(); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              highThinking
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
            title={language === 'en' ? "Activate high reasoning mode (Gemini 3.1 Pro)" : "ከፍተኛ የማሰብ ችሎታን አግብር (Gemini 3.1 Pro)"}
          >
            <Bot className={`w-4 h-4 ${highThinking ? 'animate-pulse text-amber-400' : ''}`} />
            <span className="hidden sm:inline">
              {language === 'en' 
                ? (highThinking ? "🧠 High Thinking: ON" : "🧠 Thinking Mode") 
                : (highThinking ? "🧠 ማሰብ፡ በርቷል" : "🧠 የማሰብ ሁኔታ")}
            </span>
          </button>

          {/* AI Tools Suite Button */}
          <button
            onClick={() => { setIsStudyToolsOpen(true); playClickChime(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-sm transition-all cursor-pointer"
            title={language === 'en' ? "Launch AI Quiz & Summary Tools" : "የኤአይ የጥናት መሳሪያዎች"}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">
              {language === 'en' ? "Tools" : "መሳሪያዎች"}
            </span>
          </button>

          <button
            onClick={clearHistory}
            title={language === 'en' ? "Clear Chat" : "ውይይት አጽዳ"}
            className="text-slate-400 hover:text-amber-400 p-2.5 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 SPECIALIZED TEACHING MODES PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3 select-none">
        <button
          onClick={() => { setActiveMode('teaching'); playClickChime(); }}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
            activeMode === 'teaching'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Teaching Mode' : 'አስተማሪ ሁኔታ'}</span>
        </button>

        <button
          onClick={() => { setActiveMode('quiz'); playClickChime(); }}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
            activeMode === 'quiz'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <QuestionIcon className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Quiz Generator' : 'ፈተና አዘጋጅ'}</span>
        </button>

        <button
          onClick={() => { setActiveMode('exam_feedback'); playClickChime(); }}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
            activeMode === 'exam_feedback'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Mistake Remediation' : 'ስህተት መመርመሪያ'}</span>
        </button>

        <button
          onClick={() => { setActiveMode('chat'); playClickChime(); }}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
            activeMode === 'chat'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Free Study Chat' : 'አስጎብኚ ውይይት'}</span>
        </button>
      </div>

      {/* CONTEXT BANNER CARD (Active when arrived from a course lesson or exam) */}
      {context && (
        <div className="mb-3 bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white truncate max-w-[200px] sm:max-w-md">
                  {context.courseTitle || context.subject || selectedSubject}
                </span>
                {context.lessonTitle && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium truncate">
                    {context.lessonTitle}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'en'
                  ? `Active tutoring context connected to current study unit`
                  : `የትምህርት መረጃው በቀጥታ ከተገናኘው ትምህርት ጋር ተቀናጅቷል`}
              </p>
            </div>
          </div>
          {onClearContext && (
            <button
              onClick={() => { playClickChime(); onClearContext(); }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700 transition-colors shrink-0 cursor-pointer"
            >
              {language === 'en' ? 'Reset Context' : 'አውድ አጽዳ'}
            </button>
          )}
        </div>
      )}

      {/* Floating alert warnings or indicators */}
      {errorBanner && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2.5 text-red-400 text-xs shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Success notifier */}
      {flSuccess && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 text-amber-400 text-xs shadow-sm">
          <Check className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{flSuccess}</span>
        </div>
      )}

      {/* Chat messages layout viewport */}
      <div className="flex-1 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 shadow-inner overflow-y-auto mb-4 relative min-h-0 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <MessageSquare className="w-12 h-12 mb-3 text-amber-400/40 shrink-0" />
            <p className="text-sm text-slate-300">
              {language === 'en' ? 'Type your study query to begin...' : 'ለመጀመር የጥናት ጥያቄዎን ይጻፉ...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                key={index}
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Bubble icon */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border text-[12px] font-bold shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-900 border-slate-800 text-amber-400'
                }`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>

                {/* Bubble text content */}
                <div className="flex flex-col">
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-slate-950 rounded-tr-none font-semibold'
                      : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none font-sans'
                  }`}>
                    {msg.attachment && (
                      <div className="mb-2.5">
                        {msg.attachment.mimeType.startsWith('image/') ? (
                          <img 
                            src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                            alt="Attached Homework" 
                            className="max-h-56 w-auto rounded-lg border border-slate-800 object-contain max-w-full"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300">
                            <File className="w-4 h-4 text-amber-400" />
                            <span className="truncate">{msg.attachment.name}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-line text-sm font-sans break-words">{msg.content}</p>
                  </div>

                  {msg.role === 'assistant' && msg.content && (
                    <div className="flex items-center gap-1.5 mt-1 self-start">
                      <button 
                        onClick={() => speakText(msg.content, index)}
                        className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                          speakingMsgIdx === index 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                        }`}
                        title={speakingMsgIdx === index ? "Stop voice" : "Read aloud (TTS)"}
                      >
                        {speakingMsgIdx === index ? (
                          <>
                            <VolumeX className="w-3 h-3 text-amber-400 animate-pulse" />
                            <span>{language === 'en' ? 'Stop' : 'አቁም'}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>{language === 'en' ? 'Listen' : 'አዳምጥ'}</span>
                          </>
                        )}
                      </button>

                      <button 
                        onClick={() => copyText(msg.content, index)}
                        className="text-[10px] text-slate-400 flex items-center gap-1 hover:text-amber-400 px-2 py-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {copiedIndex === index ? <Check className="w-3 h-3 text-amber-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0 animate-pulse">
                  AI
                </div>
                <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 shadow-sm">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs font-sans">
                    {language === 'en' 
                      ? (highThinking ? 'Tutor is reasoning (3.1 Pro High Thinking)...' : 'Tutor is thinking...') 
                      : (highThinking ? 'መርጃው በከፍተኛ ማሰብ እያሰላሰለ ነው (3.1 Pro)...' : 'መርጃው እያሰበ ነው...')}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* FOOTER MESSAGE DISPATCH & SUGGESTION CHIPS CHIP LIST */}
      <div className="space-y-3 mt-auto">
        {/* "Suggested Questions" chips */}
        <div>
          <p className="text-[10.5px] text-slate-400 uppercase font-bold tracking-wider mb-1 px-1 flex items-center gap-1 select-none">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {language === 'en' ? 'Suggested topics' : 'የሚመከሩ ጥያቄዎች'}
          </p>
          <div className="flex flex-wrap gap-1.5 py-1">
            {suggestedQuestions.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => { playClickChime(); handleSend(chip.value); }}
                className="text-xs bg-slate-900 text-slate-200 hover:text-amber-400 hover:border-amber-500/40 border border-slate-800 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 font-medium min-h-[38px]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input area attachments preview */}
        {attachedFile && (
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 p-2.5 rounded-xl self-start text-xs shadow-sm max-w-sm animate-fade-in">
            {attachedFile.previewUrl ? (
              <img src={attachedFile.previewUrl} alt="Upload preview" className="w-9 h-9 rounded object-cover border border-slate-800" />
            ) : (
              <File className="w-5 h-5 text-amber-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-slate-200">{attachedFile.name}</p>
            </div>
            <button
              onClick={() => { setAttachedFile(null); playClickChime(); }}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Input Box - always visible at bottom */}
        <div className="flex gap-2">
          <button
            onClick={() => { playClickChime(); fileInputRef.current?.click(); }}
            title={language === 'en' ? "Attach study guide image or PDF" : "ማስረጃ ፋይል አያይዝ"}
            className="w-12 h-12 min-h-[48px] bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors shrink-0 shadow-sm cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder={language === 'en' ? `Ask anything about ${selectedSubject}...` : `ስለ ${selectedSubject} ያሰቡትን ይጠይቁ...`}
            className="flex-1 bg-slate-900 text-white text-sm px-4 py-3 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none shadow-sm transition-colors min-w-0 h-12 min-h-[48px]"
          />

          <button
            onClick={startVoiceInput}
            title="Voice Speech Input"
            className={`w-12 h-12 min-h-[48px] bg-slate-900 border rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm cursor-pointer ${
              listening 
                ? 'text-red-400 border-red-500/40 bg-red-500/10 animate-pulse' 
                : 'text-slate-400 border-slate-800 hover:text-amber-400 hover:border-amber-500/40'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleSend()}
            disabled={(!inputValue.trim() && !attachedFile) || isTyping}
            className="h-12 min-h-[48px] px-5 bg-amber-500 text-slate-950 hover:bg-amber-600 font-bold text-sm rounded-xl flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed shadow transition-all hover:scale-102 shrink-0 cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Paywall Modal Gating Component */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgradeClick={() => {
          setIsPaywallOpen(false);
          if (onOpenUpgrade) onOpenUpgrade();
        }}
        language={language}
        questionsUsed={getDailyAIUsageCount(profile.email || profile.name || 'guest')}
        maxQuestions={FREE_DAILY_AI_LIMIT}
      />

      {/* AI Study Tools Suite Modal */}
      <AIStudyToolsModal
        isOpen={isStudyToolsOpen}
        onClose={() => setIsStudyToolsOpen(false)}
        language={language}
        userApiKey={apiKey}
        enrolledSubjects={enrolledSubjects}
      />
    </div>
  );
}
