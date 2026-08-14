/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubscriptionTier = 'free' | 'pro_monthly' | 'exam_season_pass' | 'subject_bundle';
export type SubscriptionStatus = 'active' | 'pending' | 'expired' | 'none';
export type PaymentProvider = 'telebirr' | 'cbe_birr' | 'chapa' | 'santim_pay' | 'manual';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface SubscriptionRecord {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  subjectBundleId?: string;
  startDate: string;
  endDate?: string;
  paymentMethod: PaymentProvider;
  autoRenew: boolean;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  providerTxnId: string;
  senderName: string;
  senderPhone?: string;
  receiptImage?: string; // Base64 data URL or image preview URL of receipt
  agreedToTerms?: boolean;
  status: PaymentStatus;
  createdAt: string;
}

export interface FeatureUsageRecord {
  userId: string;
  featureType: 'ai_tutor_queries' | 'quiz_attempts' | 'pdf_downloads';
  count: number;
  resetAt: string; // ISO Date String
}

export interface AccountInfo {
  email: string;
  passwordEncrypted: string;
  rememberMe: boolean;
  profile: StudentProfile;
}

export interface StudentProfile {
  name: string;
  email?: string;
  university: string;
  year: string;
  subjects: string[];
  claudeApiKey: string;
  dailyGoalHours: number;
  theme: 'dark' | 'light' | 'auto';
  language: 'en' | 'am' | 'both';
  avatar?: string; // Preset name or Base64 string of student photo
  phone?: string;
  isRegistered?: boolean;
  unregisteredAICredits?: number;
  // Premium subscription details
  isPro?: boolean;
  tier?: SubscriptionTier;
  proStatus?: 'none' | 'trial' | 'pending' | 'active' | 'expired';
  proPaymentTxn?: string;
  proPaymentDate?: string;
  proStartDate?: string;
  proEndDate?: string;
  purchasedBundles?: string[]; // Array of subject bundle IDs purchased
  senderName?: string;
  proPaymentPhone?: string;
  paymentMethod?: PaymentProvider;
  proReceiptImage?: string; // Base64 data string or image URL of payment receipt
  agreedToTerms?: boolean;
  agreedToTermsDate?: string;
  telegramId?: string;
  telegramUsername?: string;
  referralCode?: string;
  referredBy?: string;
  userRole?: 'student' | 'instructor' | 'admin' | 'super_admin';
}

export interface CouponCode {
  code: string;
  discountPercentage: number;
  fixedDiscountETB?: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  isActive: boolean;
}

export interface PlatformAnnouncement {
  id: string;
  title: string;
  message: string;
  date: string;
  badgeText?: string;
  isImportant?: boolean;
  status?: 'draft' | 'published' | 'archived';
  createdAt?: string;
}

export type CourseStatus = 'draft' | 'published' | 'archived';

export interface CourseRecord {
  id: string;
  title: string;
  description: string;
  subject: string;
  level: 'Grade 12' | 'University' | 'Grade 12 New Curriculum' | 'Common Courses';
  status: CourseStatus;
  lessonsCount: number;
  goalDays: number;
  instructorId?: string;
  instructorName?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonRecord {
  id: string;
  courseId: string;
  title: string;
  chapterNumber: number;
  content: string;
  duration: string;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDashboardStats {
  totalStudents: number;
  publishedCourses: number;
  draftCourses: number;
  totalLessons: number;
  totalRevenueETB: number;
  pendingPaymentsCount: number;
  totalPaymentsCount: number;
  activeAnnouncementsCount: number;
  activeCouponsCount: number;
  recentActivity: {
    id: string;
    type: 'user_registered' | 'course_published' | 'course_created' | 'payment_received' | 'announcement_posted';
    title: string;
    description: string;
    timestamp: string;
  }[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty?: string;
  explanation?: string;
  // SM-2 Spaced Repetition Fields
  interval: number; // in days
  repetition: number;
  easeFactor: number;
  dueDate: string; // ISO string
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  cards: Flashcard[];
}

export interface CustomNote {
  id: string;
  title: string;
  content: string;
  subject: string;
  tags: string[];
  color: string; // Tailwind bg color class
  createdAt: string;
}

export interface ExamSession {
  id: string;
  subject: string;
  date: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  weakAreas: string[];
}

export interface StudySession {
  id: string;
  subject: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
}

export interface FlashcardReviewLog {
  date: string; // YYYY-MM-DD
  reviewedCount: number;
  correctCount: number;
}

export interface AppState {
  currentPage: string;
  profile: StudentProfile | null;
  streak: {
    current: number;
    highest: number;
    lastActiveDate: string | null;
  };
  customNotes: CustomNote[];
  examSessions: ExamSession[];
  studySessions: StudySession[];
  flashcardLogs: FlashcardReviewLog[];
  decksState: { [deckId: string]: Flashcard[] }; // Overrides / stores review state of cards in a deck
}
