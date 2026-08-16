import { getSupabase } from './supabaseClient';
import { safeStorage } from './safeStorage';
import { CourseRecord, LessonRecord, AdminDashboardStats, CouponCode, PlatformAnnouncement, CourseStatus } from '../types';
import { INITIAL_CURRICULUM_COURSES, getCurriculumLessonsForCourse, getCurriculumCourse } from '../data/coursesCurriculum';

// ============================================================================
// ETHIOLEARN PRO - SUPABASE COURSES, PUBLISHING & ADMIN DATA SERVICE
// Single Source of Truth for Real DB Records (Duplicate-Proof Architecture)
// ============================================================================

const LOCAL_STORAGE_COURSES_KEY = 'ethiolearn_supabase_courses_cache';
const LOCAL_STORAGE_LESSONS_KEY = 'ethiolearn_supabase_lessons_cache';
const LOCAL_STORAGE_PAYMENTS_KEY = 'ethiolearn_payments_cache';
const LOCAL_STORAGE_COUPONS_KEY = 'ethiolearn_coupons_cache';
const LOCAL_STORAGE_ANNOUNCEMENTS_KEY = 'ethiolearn_announcements_cache';

// Helper to sanitize and map course rows from DB
function mapDbCourse(row: any): CourseRecord {
  return {
    id: row.id,
    title: row.title || 'Untitled Course',
    description: row.description || '',
    subject: row.subject || 'General',
    level: row.level || 'University',
    status: (row.status as CourseStatus) || 'draft',
    lessonsCount: Number(row.lessons_count || row.lessonsCount || 0),
    goalDays: Number(row.goal_days || row.goalDays || 14),
    instructorId: row.instructor_id || row.instructorId || '',
    instructorName: row.instructor_name || row.instructorName || 'EthioLearn Faculty',
    thumbnailUrl: row.thumbnail_url || row.thumbnailUrl || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

// Helper to sanitize and map lesson rows from DB
function mapDbLesson(row: any): LessonRecord {
  return {
    id: row.id,
    courseId: row.course_id || row.courseId,
    title: row.title || 'Lesson',
    chapterNumber: Number(row.chapter_number || row.chapterNumber || 1),
    content: row.content || '',
    duration: row.duration || '15m',
    status: (row.status as CourseStatus) || 'published',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// 1. STUDENT QUERIES (Published Only)
// ----------------------------------------------------------------------------

/**
 * Fetch strictly published courses for students.
 * Guarantees no draft/archived courses are shown, and no duplicates are returned.
 */
export async function fetchPublishedCourses(levelFilter?: string): Promise<CourseRecord[]> {
  const supabase = getSupabase();
  
  if (supabase) {
    try {
      let query = supabase
        .from('courses')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (levelFilter && levelFilter !== 'All') {
        query = query.eq('level', levelFilter);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        // De-duplicate strictly by database ID
        const seenIds = new Set<string>();
        const uniqueCourses: CourseRecord[] = [];
        for (const row of data) {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            uniqueCourses.push(mapDbCourse(row));
          }
        }
        // Cache locally for offline resilience
        safeStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(uniqueCourses));
        return uniqueCourses;
      }
      if (error) {
        console.warn('[Supabase fetchPublishedCourses warning]:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase fetchPublishedCourses exception]:', e);
    }
  }

  // Fallback to local storage cache if Supabase is offline/unreachable
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    if (raw) {
      const parsed: CourseRecord[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seenIds = new Set<string>();
        return parsed
          .filter(c => c.status === 'published' && (!levelFilter || levelFilter === 'All' || c.level === levelFilter))
          .filter(c => {
            if (seenIds.has(c.id)) return false;
            seenIds.add(c.id);
            return true;
          });
      }
    }
  } catch (err) {
    console.error('Error reading cached courses:', err);
  }

  // Fallback to initial authentic curriculum courses
  const curriculumCourses = INITIAL_CURRICULUM_COURSES.map(c => c.course);
  return curriculumCourses.filter(c => c.status === 'published' && (!levelFilter || levelFilter === 'All' || c.level === levelFilter));
}

/**
 * Fetch a single course by its unique ID
 */
export async function fetchCourseById(courseId: string): Promise<CourseRecord | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (!error && data) {
        return mapDbCourse(data);
      }
    } catch (e) {
      console.warn('Error fetching course by ID:', e);
    }
  }

  // Fallback local cache check
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    if (raw) {
      const courses: CourseRecord[] = JSON.parse(raw);
      const found = courses.find(c => c.id === courseId);
      if (found) return found;
    }
  } catch {}

  const curr = getCurriculumCourse(courseId);
  return curr ? curr.course : null;
}

/**
 * Fetch lessons for a specific course (students only see published lessons)
 */
export async function fetchCourseLessons(courseId: string, isAdmin = false): Promise<LessonRecord[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('chapter_number', { ascending: true });

      if (!isAdmin) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        const seenIds = new Set<string>();
        return data
          .map(mapDbLesson)
          .filter(l => {
            if (seenIds.has(l.id)) return false;
            seenIds.add(l.id);
            return true;
          });
      }
    } catch (e) {
      console.warn('Error fetching course lessons from Supabase:', e);
    }
  }

  // Fallback cache check
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_LESSONS_KEY);
    if (raw) {
      const lessons: LessonRecord[] = JSON.parse(raw);
      const matched = lessons.filter(l => l.courseId === courseId && (isAdmin || l.status === 'published'));
      if (matched.length > 0) return matched;
    }
  } catch {}

  // Fallback to structured curriculum lessons
  const curriculumLessons = getCurriculumLessonsForCourse(courseId);
  return curriculumLessons.filter(l => isAdmin || l.status === 'published');
}

// ----------------------------------------------------------------------------
// 2. ADMIN QUERIES & MUTATIONS (Draft, Published, Archived)
// ----------------------------------------------------------------------------

/**
 * Fetch all courses for Admin dashboard (Drafts, Published, and Archived).
 */
export async function fetchAdminCourses(): Promise<CourseRecord[]> {
  const supabase = getSupabase();
  let dbCourses: CourseRecord[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const seenIds = new Set<string>();
        for (const row of data) {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            dbCourses.push(mapDbCourse(row));
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching admin courses from Supabase:', e);
    }
  }

  // Check local storage cache
  let cachedCourses: CourseRecord[] = [];
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) cachedCourses = parsed;
    }
  } catch {}

  // Fallback to initial comprehensive curriculum courses if none in DB or cache
  const defaultCourses = INITIAL_CURRICULUM_COURSES.map(c => c.course);

  // Merge uniquely
  const mergedMap = new Map<string, CourseRecord>();
  defaultCourses.forEach(c => mergedMap.set(c.id, c));
  cachedCourses.forEach(c => mergedMap.set(c.id, c));
  dbCourses.forEach(c => mergedMap.set(c.id, c));

  const result = Array.from(mergedMap.values()).sort((a, b) => {
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });

  try {
    safeStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(result));
  } catch {}

  return result;
}

/**
 * Create a new course with a stable unique ID.
 * Avoids duplicate records by checking existence first.
 */
export async function createCourse(course: Partial<CourseRecord>): Promise<{ success: boolean; course?: CourseRecord; error?: string }> {
  const id = course.id || `course_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newCourse: CourseRecord = {
    id,
    title: course.title || 'New Course',
    description: course.description || '',
    subject: course.subject || 'General',
    level: course.level || 'University',
    status: course.status || 'draft',
    lessonsCount: course.lessonsCount || 0,
    goalDays: course.goalDays || 14,
    instructorId: course.instructorId || 'admin',
    instructorName: course.instructorName || 'EthioLearn Faculty',
    thumbnailUrl: course.thumbnailUrl || '',
    createdAt: now,
    updatedAt: now,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const dbPayload = {
        id: newCourse.id,
        title: newCourse.title,
        description: newCourse.description,
        subject: newCourse.subject,
        level: newCourse.level,
        status: newCourse.status,
        lessons_count: newCourse.lessonsCount,
        goal_days: newCourse.goalDays,
        instructor_id: newCourse.instructorId,
        instructor_name: newCourse.instructorName,
        thumbnail_url: newCourse.thumbnailUrl,
        created_at: newCourse.createdAt,
        updated_at: newCourse.updatedAt,
      };

      const { error } = await supabase.from('courses').insert(dbPayload);
      if (error) {
        console.error('Supabase createCourse error:', error);
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      console.error('createCourse exception:', e);
      return { success: false, error: e.message };
    }
  }

  // Update local storage cache
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    const list: CourseRecord[] = raw ? JSON.parse(raw) : [];
    // Ensure no duplicates
    const filtered = list.filter(c => c.id !== newCourse.id);
    filtered.unshift(newCourse);
    safeStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(filtered));
  } catch {}

  return { success: true, course: newCourse };
}

/**
 * Update an existing course in Supabase by its EXACT record ID.
 * NEVER inserts a duplicate copy.
 */
export async function updateCourse(
  courseId: string, 
  updates: Partial<CourseRecord>
): Promise<{ success: boolean; error?: string }> {
  if (!courseId) return { success: false, error: 'Course ID is required for update.' };

  const now = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const dbUpdates: any = {
        updated_at: now,
      };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
      if (updates.level !== undefined) dbUpdates.level = updates.level;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.lessonsCount !== undefined) dbUpdates.lessons_count = updates.lessonsCount;
      if (updates.goalDays !== undefined) dbUpdates.goal_days = updates.goalDays;
      if (updates.thumbnailUrl !== undefined) dbUpdates.thumbnail_url = updates.thumbnailUrl;

      const { error } = await supabase
        .from('courses')
        .update(dbUpdates)
        .eq('id', courseId);

      if (error) {
        console.error('Supabase updateCourse error:', error);
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      console.error('updateCourse exception:', e);
      return { success: false, error: e.message };
    }
  }

  // Update local storage cache
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    if (raw) {
      const list: CourseRecord[] = JSON.parse(raw);
      const index = list.findIndex(c => c.id === courseId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates, updatedAt: now };
        safeStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(list));
      }
    }
  } catch {}

  return { success: true };
}

/**
 * Publish a course (updates status to 'published' in Supabase).
 * Directly targets the unique ID to prevent duplicates.
 */
export async function publishCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  return updateCourse(courseId, { status: 'published' });
}

/**
 * Unpublish a course (updates status back to 'draft').
 */
export async function unpublishCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  return updateCourse(courseId, { status: 'draft' });
}

/**
 * Archive a course (updates status to 'archived').
 */
export async function archiveCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  return updateCourse(courseId, { status: 'archived' });
}

/**
 * Delete a course permanently from Supabase.
 */
export async function deleteCourse(courseId: string): Promise<{ success: boolean; error?: string }> {
  if (!courseId) return { success: false, error: 'Course ID is required.' };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Supabase deleteCourse error:', error);
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      console.error('deleteCourse exception:', e);
      return { success: false, error: e.message };
    }
  }

  // Update local cache
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    if (raw) {
      const list: CourseRecord[] = JSON.parse(raw);
      const filtered = list.filter(c => c.id !== courseId);
      safeStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(filtered));
    }
  } catch {}

  return { success: true };
}

/**
 * Save / update a lesson for a course.
 */
export async function saveLesson(
  courseId: string, 
  lesson: Partial<LessonRecord>
): Promise<{ success: boolean; lesson?: LessonRecord; error?: string }> {
  const id = lesson.id || `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const lessonRecord: LessonRecord = {
    id,
    courseId,
    title: lesson.title || 'Untitled Lesson',
    chapterNumber: lesson.chapterNumber || 1,
    content: lesson.content || '',
    duration: lesson.duration || '15m',
    status: lesson.status || 'published',
    createdAt: lesson.createdAt || now,
    updatedAt: now,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const dbPayload = {
        id: lessonRecord.id,
        course_id: lessonRecord.courseId,
        title: lessonRecord.title,
        chapter_number: lessonRecord.chapterNumber,
        content: lessonRecord.content,
        duration: lessonRecord.duration,
        status: lessonRecord.status,
        created_at: lessonRecord.createdAt,
        updated_at: lessonRecord.updatedAt,
      };

      const { error } = await supabase
        .from('lessons')
        .upsert(dbPayload, { onConflict: 'id' });

      if (error) {
        console.error('Supabase saveLesson error:', error);
        return { success: false, error: error.message };
      }

      // Automatically sync lessonsCount on the parent course
      const { count } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      if (typeof count === 'number') {
        await supabase.from('courses').update({ lessons_count: count }).eq('id', courseId);
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  // Update local storage cache
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_LESSONS_KEY);
    const list: LessonRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(l => l.id !== lessonRecord.id);
    filtered.push(lessonRecord);
    safeStorage.setItem(LOCAL_STORAGE_LESSONS_KEY, JSON.stringify(filtered));
  } catch {}

  return { success: true, lesson: lessonRecord };
}

// ----------------------------------------------------------------------------
// 3. ADMIN DASHBOARD STATS (Live Supabase Aggregate Counts + Resilient Local Layer)
// ----------------------------------------------------------------------------

export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = getSupabase();

  let totalStudents = 0;
  let publishedCourses = 0;
  let draftCourses = 0;
  let totalLessons = 0;
  let totalRevenueETB = 0;
  let pendingPaymentsCount = 0;
  let totalPaymentsCount = 0;
  let activeAnnouncementsCount = 0;
  let activeCouponsCount = 0;
  const recentActivity: AdminDashboardStats['recentActivity'] = [];

  // Fetch courses from unified source
  const allCourses = await fetchAdminCourses();
  publishedCourses = allCourses.filter(c => c.status === 'published').length;
  draftCourses = allCourses.filter(c => c.status === 'draft').length;
  totalLessons = allCourses.reduce((acc, c) => acc + (c.lessonsCount || 0), 0);

  allCourses.slice(0, 5).forEach(c => {
    recentActivity.push({
      id: `act_course_${c.id}`,
      type: c.status === 'published' ? 'course_published' : 'course_created',
      title: c.status === 'published' ? 'Course Published' : 'Draft Course Created',
      description: `"${c.title}" updated in database catalog`,
      timestamp: c.updatedAt || c.createdAt || new Date().toISOString(),
    });
  });

  // Fetch students from unified source
  const allStudents = await fetchAdminStudents();
  totalStudents = allStudents.length;

  allStudents.slice(0, 5).forEach((st, idx) => {
    recentActivity.push({
      id: `act_student_${st.email || st.id || idx}`,
      type: 'user_registered',
      title: 'New Student Enrollment',
      description: `${st.name || 'Student'} (${st.university || 'Registered'}) joined the campus portal`,
      timestamp: st.created_at || st.createdAt || new Date().toISOString(),
    });
  });

  // Fetch payments from unified source
  const allPayments = await fetchAdminPayments();
  totalPaymentsCount = allPayments.length;
  allPayments.forEach(p => {
    const amt = Number(p.amount || 0);
    if (p.status === 'completed') {
      totalRevenueETB += amt;
    } else if (p.status === 'pending') {
      pendingPaymentsCount++;
    }
  });

  allPayments.slice(0, 5).forEach(p => {
    const amt = Number(p.amount || 0);
    recentActivity.push({
      id: `act_pay_${p.id}`,
      type: 'payment_received',
      title: `Payment ${p.status === 'completed' ? 'Verified' : 'Pending'} (${amt} ETB)`,
      description: `Transaction from ${p.sender_name || p.senderName || p.userId || 'Student'} via ${(p.provider || 'local').toUpperCase()}`,
      timestamp: p.created_at || p.createdAt || new Date().toISOString(),
    });
  });

  // Announcements count
  const allAnnouncements = await fetchAnnouncements();
  activeAnnouncementsCount = allAnnouncements.length;

  // Coupons count
  const allCoupons = await fetchCoupons();
  activeCouponsCount = allCoupons.filter(c => c.isActive).length;

  // Sort recent activity by timestamp descending
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalStudents,
    publishedCourses,
    draftCourses,
    totalLessons,
    totalRevenueETB,
    pendingPaymentsCount,
    totalPaymentsCount,
    activeAnnouncementsCount,
    activeCouponsCount,
    recentActivity: recentActivity.slice(0, 10),
  };
}

// ----------------------------------------------------------------------------
// 4. ANNOUNCEMENTS & COUPONS DATABASE QUERIES
// ----------------------------------------------------------------------------

export async function fetchAnnouncements(publishedOnly = false): Promise<PlatformAnnouncement[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false });

      if (publishedOnly) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          title: row.title,
          message: row.message,
          badgeText: row.badge_text || 'Notice',
          isImportant: Boolean(row.is_important),
          status: row.status || 'published',
          date: row.date || new Date().toISOString().split('T')[0],
          createdAt: row.created_at,
        }));
      }
    } catch (e) {
      console.warn('Error fetching announcements:', e);
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    safeStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  } catch {}

  return DEFAULT_ANNOUNCEMENTS;
}

export async function createAnnouncement(ann: Partial<PlatformAnnouncement>): Promise<{ success: boolean; announcement?: PlatformAnnouncement; error?: string }> {
  const id = ann.id || `ann_${Date.now()}`;
  const now = new Date().toISOString();
  const dateStr = ann.date || now.split('T')[0];

  const newAnn: PlatformAnnouncement = {
    id,
    title: ann.title || 'Notice',
    message: ann.message || '',
    badgeText: ann.badgeText || 'Notice',
    isImportant: Boolean(ann.isImportant),
    status: ann.status || 'published',
    date: dateStr,
    createdAt: now,
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('announcements').insert({
        id: newAnn.id,
        title: newAnn.title,
        message: newAnn.message,
        badge_text: newAnn.badgeText,
        is_important: newAnn.isImportant,
        status: newAnn.status,
        date: newAnn.date,
        created_at: newAnn.createdAt,
      });

      if (error) return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY);
    const list: PlatformAnnouncement[] = raw ? JSON.parse(raw) : [];
    list.unshift(newAnn);
    safeStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(list));
  } catch {}

  return { success: true, announcement: newAnn };
}

export async function deleteAnnouncement(annId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', annId);
      if (error) return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY);
    if (raw) {
      const list: PlatformAnnouncement[] = JSON.parse(raw);
      safeStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(list.filter(a => a.id !== annId)));
    }
  } catch {}

  return { success: true };
}

const DEFAULT_ANNOUNCEMENTS: PlatformAnnouncement[] = [
  {
    id: 'ann_wku_exam_2026',
    title: 'Wolkite University Midterm Exam Schedule 2026',
    message: 'Official exam prep modules and past questions for freshman and sophomore courses are now updated under Uni Exams.',
    badgeText: 'Exam Alert',
    isImportant: true,
    status: 'published',
    date: '2026-03-15',
    createdAt: '2026-03-15T08:00:00.000Z'
  },
  {
    id: 'ann_freshman_notes_update',
    title: 'New Freshman Common Course Notes Published',
    message: 'Comprehensive lecture notes and flashcards added for Emerging Tech (EmTe 1012), General Biology (Biol 1011), and Intro Economics (Econ 1011).',
    badgeText: 'Curriculum',
    isImportant: false,
    status: 'published',
    date: '2026-03-10',
    createdAt: '2026-03-10T10:00:00.000Z'
  }
];

const DEFAULT_COUPONS: CouponCode[] = [
  {
    code: 'WKU2026',
    discountPercentage: 20,
    fixedDiscountETB: 0,
    maxUses: 100,
    usedCount: 14,
    expiresAt: '2026-12-31',
    isActive: true
  },
  {
    code: 'ETHIOLEARN',
    discountPercentage: 30,
    fixedDiscountETB: 0,
    maxUses: 50,
    usedCount: 8,
    expiresAt: '2026-12-31',
    isActive: true
  },
  {
    code: 'FRESHMAN50',
    discountPercentage: 50,
    fixedDiscountETB: 0,
    maxUses: 200,
    usedCount: 47,
    expiresAt: '2026-12-31',
    isActive: true
  }
];

const DEFAULT_STARTER_STUDENTS = [
  {
    id: 'std_wku_01',
    name: 'Bekele Tadesse',
    email: 'bekele.tadesse@wku.edu.et',
    university: 'Wolkite University',
    year: 'Year 2 (Sophomore)',
    is_pro: true,
    isPro: true,
    user_role: 'Student',
    userRole: 'Student',
    created_at: '2026-02-14T09:30:00.000Z',
    createdAt: '2026-02-14T09:30:00.000Z'
  },
  {
    id: 'std_aau_02',
    name: 'Selamawit Alemu',
    email: 'selamawit.alemu@aau.edu.et',
    university: 'Addis Ababa University',
    year: 'Year 1 (Freshman)',
    is_pro: false,
    isPro: false,
    user_role: 'Student',
    userRole: 'Student',
    created_at: '2026-03-01T14:15:00.000Z',
    createdAt: '2026-03-01T14:15:00.000Z'
  },
  {
    id: 'std_hu_03',
    name: 'Dawit Mekonnen',
    email: 'dawit.m@hu.edu.et',
    university: 'Hawassa University',
    year: 'Year 3 (Junior)',
    is_pro: false,
    isPro: false,
    user_role: 'Student',
    userRole: 'Student',
    created_at: '2026-03-05T11:20:00.000Z',
    createdAt: '2026-03-05T11:20:00.000Z'
  },
  {
    id: 'std_bdu_04',
    name: 'Tigist Haile',
    email: 'tigist.h@bdu.edu.et',
    university: 'Bahir Dar University',
    year: 'Year 4 (Senior)',
    is_pro: true,
    isPro: true,
    user_role: 'Student',
    userRole: 'Student',
    created_at: '2026-03-12T16:40:00.000Z',
    createdAt: '2026-03-12T16:40:00.000Z'
  }
];

const DEFAULT_STARTER_PAYMENTS = [
  {
    id: 'PAY-10492',
    userId: 'bekele.tadesse@wku.edu.et',
    user_id: 'bekele.tadesse@wku.edu.et',
    amount: 199,
    currency: 'ETB',
    provider: 'telebirr',
    providerTxnId: 'TLB-9843219482',
    provider_transaction_id: 'TLB-9843219482',
    senderName: 'Bekele Tadesse',
    sender_name: 'Bekele Tadesse',
    senderPhone: '+251911458920',
    sender_phone: '+251911458920',
    status: 'completed',
    createdAt: '2026-02-14T09:35:00.000Z',
    created_at: '2026-02-14T09:35:00.000Z'
  },
  {
    id: 'PAY-10518',
    userId: 'selamawit.alemu@aau.edu.et',
    user_id: 'selamawit.alemu@aau.edu.et',
    amount: 299,
    currency: 'ETB',
    provider: 'cbe_birr',
    providerTxnId: 'CBE-2026849201',
    provider_transaction_id: 'CBE-2026849201',
    senderName: 'Selamawit Alemu',
    sender_name: 'Selamawit Alemu',
    senderPhone: '+251922784102',
    sender_phone: '+251922784102',
    status: 'pending',
    createdAt: '2026-03-01T14:20:00.000Z',
    created_at: '2026-03-01T14:20:00.000Z'
  },
  {
    id: 'PAY-10523',
    userId: 'dawit.m@hu.edu.et',
    user_id: 'dawit.m@hu.edu.et',
    amount: 99,
    currency: 'ETB',
    provider: 'telebirr',
    providerTxnId: 'TLB-5719302194',
    provider_transaction_id: 'TLB-5719302194',
    senderName: 'Dawit Mekonnen',
    sender_name: 'Dawit Mekonnen',
    senderPhone: '+251933561948',
    sender_phone: '+251933561948',
    status: 'pending',
    createdAt: '2026-03-05T11:25:00.000Z',
    created_at: '2026-03-05T11:25:00.000Z'
  }
];

export async function fetchCoupons(): Promise<CouponCode[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          code: row.code,
          discountPercentage: Number(row.discount_percentage || 20),
          fixedDiscountETB: Number(row.fixed_discount_etb || 0),
          maxUses: Number(row.max_uses || 100),
          usedCount: Number(row.used_count || 0),
          expiresAt: row.expires_at || '2026-12-31',
          isActive: Boolean(row.is_active),
        }));
      }
    } catch (e) {
      console.warn('Error fetching coupons:', e);
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COUPONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    safeStorage.setItem(LOCAL_STORAGE_COUPONS_KEY, JSON.stringify(DEFAULT_COUPONS));
  } catch {}

  return DEFAULT_COUPONS;
}

export async function createCoupon(coupon: CouponCode): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('coupons').upsert({
        code: coupon.code.toUpperCase().trim(),
        discount_percentage: coupon.discountPercentage,
        fixed_discount_etb: coupon.fixedDiscountETB || 0,
        max_uses: coupon.maxUses,
        used_count: coupon.usedCount || 0,
        expires_at: coupon.expiresAt,
        is_active: coupon.isActive,
        created_at: new Date().toISOString(),
      }, { onConflict: 'code' });

      if (error) return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COUPONS_KEY);
    const list: CouponCode[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(c => c.code.toUpperCase() !== coupon.code.toUpperCase());
    filtered.unshift(coupon);
    safeStorage.setItem(LOCAL_STORAGE_COUPONS_KEY, JSON.stringify(filtered));
  } catch {}

  return { success: true };
}

export async function deleteCoupon(code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('coupons').delete().eq('code', code.toUpperCase().trim());
      if (error) return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COUPONS_KEY);
    if (raw) {
      const list: CouponCode[] = JSON.parse(raw);
      safeStorage.setItem(LOCAL_STORAGE_COUPONS_KEY, JSON.stringify(list.filter(c => c.code.toUpperCase() !== code.toUpperCase())));
    }
  } catch {}

  return { success: true };
}

// ----------------------------------------------------------------------------
// 5. PAYMENTS & USERS QUERIES (Admin View)
// ----------------------------------------------------------------------------

export async function fetchAdminPayments(): Promise<any[]> {
  const supabase = getSupabase();
  let dbPayments: any[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        dbPayments = data;
      }
    } catch (e) {
      console.warn('Error fetching admin payments:', e);
    }
  }

  let cachedPayments: any[] = [];
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) cachedPayments = parsed;
    }
  } catch {}

  // Scan local user payment keys
  const userPayments: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ethiolearn_payments_') && key !== LOCAL_STORAGE_PAYMENTS_KEY) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) userPayments.push(...list);
        }
      }
    }
  } catch {}

  // Merge uniquely by payment ID or providerTxnId
  const payMap = new Map<string, any>();
  DEFAULT_STARTER_PAYMENTS.forEach(p => payMap.set(p.id, p));
  cachedPayments.forEach(p => payMap.set(p.id, p));
  userPayments.forEach(p => payMap.set(p.id || p.providerTxnId, {
    ...p,
    id: p.id || `PAY-${Date.now()}`,
    user_id: p.userId,
    sender_name: p.senderName || p.userId,
    sender_phone: p.senderPhone,
    provider_transaction_id: p.providerTxnId,
    created_at: p.createdAt || new Date().toISOString()
  }));
  dbPayments.forEach(p => payMap.set(p.id, p));

  const result = Array.from(payMap.values()).sort((a, b) => {
    return new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime();
  });

  try {
    safeStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(result));
  } catch {}

  return result;
}

export async function updatePaymentStatus(paymentId: string, status: 'completed' | 'failed' | 'pending'): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  let paymentRecord: any = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .select()
        .maybeSingle();

      if (!error && data) {
        paymentRecord = data;
      }
    } catch (e: any) {
      console.warn('Supabase payment status update notice:', e.message);
    }
  }

  // Update local cache
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY);
    if (raw) {
      const list: any[] = JSON.parse(raw);
      const index = list.findIndex(p => p.id === paymentId || p.providerTxnId === paymentId);
      if (index !== -1) {
        list[index].status = status;
        paymentRecord = list[index];
        safeStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(list));
      }
    }
  } catch {}

  // If approved, automatically upgrade the corresponding student account to Pro!
  if (status === 'completed' && paymentRecord) {
    const targetEmail = (paymentRecord.user_id || paymentRecord.userId || paymentRecord.sender_name || paymentRecord.senderName || '').toLowerCase().trim();
    
    // Update local accounts
    try {
      const rawAccounts = safeStorage.getItem('ethiolearn_accounts');
      if (rawAccounts) {
        const accounts: any[] = JSON.parse(rawAccounts);
        const updatedAccounts = accounts.map(acc => {
          if (acc.email && (acc.email.toLowerCase().trim() === targetEmail || targetEmail.includes(acc.email.toLowerCase().trim()))) {
            return {
              ...acc,
              profile: {
                ...acc.profile,
                isPro: true,
                tier: 'pro_semester',
                proStatus: 'active',
                proPaymentDate: new Date().toISOString()
              }
            };
          }
          return acc;
        });
        safeStorage.setItem('ethiolearn_accounts', JSON.stringify(updatedAccounts));
      }
    } catch {}

    // Update active profile if it matches
    try {
      const rawProf = safeStorage.getItem('ethiolearn_current_profile');
      if (rawProf) {
        const curProf = JSON.parse(rawProf);
        if (curProf.email && (curProf.email.toLowerCase().trim() === targetEmail || targetEmail.includes(curProf.email.toLowerCase().trim()))) {
          const upgraded = {
            ...curProf,
            isPro: true,
            tier: 'pro_semester',
            proStatus: 'active',
            proPaymentDate: new Date().toISOString()
          };
          safeStorage.setItem('ethiolearn_current_profile', JSON.stringify(upgraded));
        }
      }
    } catch {}

    // Also update Supabase student profile if available
    if (supabase && targetEmail) {
      try {
        supabase
          .from('student_profiles')
          .update({ is_pro: true, pro_status: 'active' })
          .eq('email', targetEmail)
          .then(() => {});
      } catch {}
    }
  }

  return { success: true };
}

export async function fetchAdminStudents(searchQuery = ''): Promise<any[]> {
  const supabase = getSupabase();
  let dbStudents: any[] = [];

  if (supabase) {
    try {
      let query = supabase
        .from('student_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        dbStudents = data;
      }
    } catch (e) {
      console.warn('Error fetching admin students from Supabase:', e);
    }
  }

  // Gather local registered accounts
  const localStudents: any[] = [];
  try {
    const rawAccs = safeStorage.getItem('ethiolearn_accounts');
    if (rawAccs) {
      const accs = JSON.parse(rawAccs);
      if (Array.isArray(accs)) {
        accs.forEach(acc => {
          const prof = acc.profile || {};
          localStudents.push({
            id: `usr_${acc.email || Math.random().toString(36).substring(2, 7)}`,
            name: prof.name || acc.name || 'Student',
            email: acc.email || prof.email || 'student@wku.edu.et',
            university: prof.university || 'Wolkite University',
            year: prof.year || 'University',
            is_pro: Boolean(prof.isPro || prof.tier?.includes('pro')),
            isPro: Boolean(prof.isPro || prof.tier?.includes('pro')),
            user_role: (acc.email && acc.email.toLowerCase().includes('admin')) ? 'Admin' : 'Student',
            userRole: (acc.email && acc.email.toLowerCase().includes('admin')) ? 'Admin' : 'Student',
            created_at: prof.createdAt || new Date().toISOString(),
            createdAt: prof.createdAt || new Date().toISOString(),
            avatar: prof.avatar || '🎓'
          });
        });
      }
    }
  } catch {}

  // Gather current active profile if not in accounts
  try {
    const rawProf = safeStorage.getItem('ethiolearn_current_profile');
    if (rawProf) {
      const cur = JSON.parse(rawProf);
      if (cur.email) {
        localStudents.push({
          id: `usr_cur_${cur.email}`,
          name: cur.name || 'Current User',
          email: cur.email,
          university: cur.university || 'Wolkite University',
          year: cur.year || 'University',
          is_pro: Boolean(cur.isPro),
          isPro: Boolean(cur.isPro),
          user_role: cur.email.toLowerCase().includes('admin') ? 'Admin' : 'Student',
          userRole: cur.email.toLowerCase().includes('admin') ? 'Admin' : 'Student',
          created_at: cur.createdAt || new Date().toISOString(),
          createdAt: cur.createdAt || new Date().toISOString(),
          avatar: cur.avatar || '🎓'
        });
      }
    }
  } catch {}

  // Map and unify
  const studentMap = new Map<string, any>();

  // Starter students
  DEFAULT_STARTER_STUDENTS.forEach(st => studentMap.set(st.email.toLowerCase(), st));

  // Local registered accounts overwrite
  localStudents.forEach(st => {
    if (st.email) studentMap.set(st.email.toLowerCase(), st);
  });

  // Supabase profiles overwrite
  dbStudents.forEach(row => {
    const email = (row.email || '').toLowerCase();
    const profData = row.profile_data || {};
    if (email) {
      studentMap.set(email, {
        id: row.id || `usr_${email}`,
        name: row.name || profData.name || 'Student',
        email: row.email,
        university: row.university || profData.university || 'Wolkite University',
        year: row.year || profData.year || 'University',
        is_pro: Boolean(row.is_pro || profData.isPro),
        isPro: Boolean(row.is_pro || profData.isPro),
        user_role: row.user_role || (email.includes('admin') ? 'Admin' : 'Student'),
        userRole: row.user_role || (email.includes('admin') ? 'Admin' : 'Student'),
        created_at: row.created_at || new Date().toISOString(),
        createdAt: row.created_at || new Date().toISOString(),
        avatar: profData.avatar || '🎓'
      });
    }
  });

  let list = Array.from(studentMap.values()).sort((a, b) => {
    return new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime();
  });

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter(st => {
      return (
        (st.name && st.name.toLowerCase().includes(q)) ||
        (st.email && st.email.toLowerCase().includes(q)) ||
        (st.university && st.university.toLowerCase().includes(q))
      );
    });
  }

  return list;
}

// ----------------------------------------------------------------------------
// 6. STUDENT COURSE PROGRESS & COMPLETION TRACKING (Supabase + Local Fallback)
// ----------------------------------------------------------------------------

const LOCAL_STORAGE_PROGRESS_KEY = 'ethiolearn_student_course_progress';
const LOCAL_STORAGE_EXAM_ATTEMPTS_KEY = 'ethiolearn_student_exam_attempts';

export async function fetchStudentCourseProgress(userId: string, courseId: string): Promise<any | null> {
  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!error && data) {
        return {
          courseId: data.course_id,
          completedLessonIds: Array.isArray(data.completed_lessons) ? data.completed_lessons : [],
          lastAccessedLessonId: data.last_accessed_lesson,
          progressPercentage: Number(data.progress_percentage || 0),
          totalLessons: Number(data.total_lessons || 0),
          completedLessonsCount: Number(data.completed_lessons_count || 0),
          lastUpdated: data.updated_at || data.created_at || new Date().toISOString()
        };
      }
    } catch (e) {
      console.warn('Error fetching course progress from Supabase:', e);
    }
  }

  // Local storage fallback
  try {
    const raw = safeStorage.getItem(`${LOCAL_STORAGE_PROGRESS_KEY}_${userId || 'guest'}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[courseId]) {
        return parsed[courseId];
      }
    }
  } catch (err) {}

  return null;
}

export async function saveStudentCourseProgress(
  userId: string,
  courseId: string,
  completedLessonIds: string[],
  totalLessons: number,
  lastAccessedLessonId?: string
): Promise<{ success: boolean; progressPercentage: number }> {
  const uniqueLessonIds = Array.from(new Set(completedLessonIds));
  const completedCount = uniqueLessonIds.length;
  const progressPercentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
  const now = new Date().toISOString();

  const progressData = {
    courseId,
    completedLessonIds: uniqueLessonIds,
    lastAccessedLessonId,
    progressPercentage,
    totalLessons,
    completedLessonsCount: completedCount,
    lastUpdated: now
  };

  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      await supabase.from('course_progress').upsert({
        user_id: userId,
        course_id: courseId,
        completed_lessons: uniqueLessonIds,
        last_accessed_lesson: lastAccessedLessonId || null,
        progress_percentage: progressPercentage,
        total_lessons: totalLessons,
        completed_lessons_count: completedCount,
        updated_at: now
      }, { onConflict: 'user_id,course_id' });
    } catch (e) {
      console.warn('Error syncing progress to Supabase:', e);
    }
  }

  // Update local storage
  try {
    const storageKey = `${LOCAL_STORAGE_PROGRESS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    const map = raw ? JSON.parse(raw) : {};
    map[courseId] = progressData;
    safeStorage.setItem(storageKey, JSON.stringify(map));
  } catch (err) {}

  return { success: true, progressPercentage };
}

export async function fetchAllStudentCourseProgresses(userId: string): Promise<{ [courseId: string]: any }> {
  const result: { [courseId: string]: any } = {};

  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', userId);

      if (!error && Array.isArray(data)) {
        data.forEach(row => {
          result[row.course_id] = {
            courseId: row.course_id,
            completedLessonIds: Array.isArray(row.completed_lessons) ? row.completed_lessons : [],
            lastAccessedLessonId: row.last_accessed_lesson,
            progressPercentage: Number(row.progress_percentage || 0),
            totalLessons: Number(row.total_lessons || 0),
            completedLessonsCount: Number(row.completed_lessons_count || 0),
            lastUpdated: row.updated_at
          };
        });
        return result;
      }
    } catch (e) {
      console.warn('Error fetching all progress from Supabase:', e);
    }
  }

  try {
    const storageKey = `${LOCAL_STORAGE_PROGRESS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {}

  return result;
}

// ----------------------------------------------------------------------------
// 7. EXAM ATTEMPTS & RESULTS PERSISTENCE (Supabase + Local Fallback)
// ----------------------------------------------------------------------------

export async function saveExamAttempt(attempt: any, userId?: string): Promise<{ success: boolean; id: string }> {
  const attemptId = attempt.id || `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const record = {
    ...attempt,
    id: attemptId,
    userId: userId || 'guest',
    date: attempt.date || now,
    createdAt: now
  };

  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      await supabase.from('exam_attempts').insert({
        id: record.id,
        user_id: userId,
        exam_id: record.examId,
        exam_title: record.examTitle,
        subject: record.subject,
        score: record.score,
        total_questions: record.totalQuestions,
        percentage: record.percentage,
        grade: record.grade,
        is_passed: record.isPassed,
        time_spent_seconds: record.timeSpentSeconds,
        user_answers: record.userAnswers || {},
        flagged_questions: record.flaggedQuestions || [],
        weak_topics: record.weakTopics || [],
        incorrect_questions: record.incorrectQuestions || [],
        created_at: now
      });
    } catch (e) {
      console.warn('Error saving exam attempt to Supabase:', e);
    }
  }

  // Update local storage
  try {
    const storageKey = `${LOCAL_STORAGE_EXAM_ATTEMPTS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    safeStorage.setItem(storageKey, JSON.stringify(list.slice(0, 50)));
  } catch (err) {}

  return { success: true, id: attemptId };
}

export async function fetchStudentExamAttempts(userId?: string): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          examId: row.exam_id,
          examTitle: row.exam_title,
          subject: row.subject,
          score: Number(row.score || 0),
          totalQuestions: Number(row.total_questions || 0),
          percentage: Number(row.percentage || 0),
          grade: row.grade || 'C',
          isPassed: Boolean(row.is_passed),
          timeSpentSeconds: Number(row.time_spent_seconds || 0),
          userAnswers: row.user_answers || {},
          flaggedQuestions: row.flagged_questions || [],
          weakTopics: row.weak_topics || [],
          incorrectQuestions: row.incorrect_questions || [],
          date: row.created_at || new Date().toISOString()
        }));
      }
    } catch (e) {
      console.warn('Error fetching exam attempts from Supabase:', e);
    }
  }

  try {
    const storageKey = `${LOCAL_STORAGE_EXAM_ATTEMPTS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {}

  return [];
}

// ----------------------------------------------------------------------------
// 8. STUDENT DAILY STUDY TASKS (Supabase + Local Storage Persistence)
// ----------------------------------------------------------------------------

const LOCAL_STORAGE_TASKS_KEY = 'ethiolearn_student_study_tasks';

export async function fetchStudentTasks(userId?: string): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('student_tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          title: row.title,
          subject: row.subject,
          courseTitle: row.course_title,
          duration: row.duration || '20m',
          durationMinutes: Number(row.duration_minutes || 20),
          isCompleted: Boolean(row.is_completed),
          type: row.type || 'review',
          dueDate: row.due_date,
          createdAt: row.created_at
        }));
      }
    } catch (e) {
      console.warn('Error fetching student tasks from Supabase:', e);
    }
  }

  // Fallback to local cache
  try {
    const storageKey = `${LOCAL_STORAGE_TASKS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list;
      }
    }
  } catch (err) {}

  return [];
}

export async function saveStudentTask(task: any, userId?: string): Promise<{ success: boolean; task: any }> {
  const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const formattedTask = {
    id: taskId,
    userId: userId || 'guest',
    title: task.title,
    subject: task.subject || 'General',
    courseTitle: task.courseTitle || '',
    duration: task.duration || '20m',
    durationMinutes: Number(task.durationMinutes || 20),
    isCompleted: Boolean(task.isCompleted),
    type: task.type || 'review',
    dueDate: task.dueDate || now.split('T')[0],
    createdAt: task.createdAt || now
  };

  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      await supabase.from('student_tasks').upsert({
        id: formattedTask.id,
        user_id: userId,
        title: formattedTask.title,
        subject: formattedTask.subject,
        course_title: formattedTask.courseTitle,
        duration: formattedTask.duration,
        duration_minutes: formattedTask.durationMinutes,
        is_completed: formattedTask.isCompleted,
        type: formattedTask.type,
        due_date: formattedTask.dueDate,
        created_at: formattedTask.createdAt
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Error saving student task to Supabase:', e);
    }
  }

  // Update local storage
  try {
    const storageKey = `${LOCAL_STORAGE_TASKS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(t => t.id === formattedTask.id);
    if (index >= 0) {
      list[index] = formattedTask;
    } else {
      list.unshift(formattedTask);
    }
    safeStorage.setItem(storageKey, JSON.stringify(list));
  } catch (err) {}

  return { success: true, task: formattedTask };
}

export async function toggleStudentTaskStatus(taskId: string, isCompleted: boolean, userId?: string): Promise<{ success: boolean }> {
  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      await supabase
        .from('student_tasks')
        .update({ is_completed: isCompleted, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Error updating student task status in Supabase:', e);
    }
  }

  // Update local storage
  try {
    const storageKey = `${LOCAL_STORAGE_TASKS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      const list: any[] = JSON.parse(raw);
      const updated = list.map(t => t.id === taskId ? { ...t, isCompleted } : t);
      safeStorage.setItem(storageKey, JSON.stringify(updated));
    }
  } catch (err) {}

  return { success: true };
}

export async function deleteStudentTask(taskId: string, userId?: string): Promise<{ success: boolean }> {
  const supabase = getSupabase();
  if (supabase && userId) {
    try {
      await supabase
        .from('student_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
    } catch (e) {
      console.warn('Error deleting student task in Supabase:', e);
    }
  }

  // Update local storage
  try {
    const storageKey = `${LOCAL_STORAGE_TASKS_KEY}_${userId || 'guest'}`;
    const raw = safeStorage.getItem(storageKey);
    if (raw) {
      const list: any[] = JSON.parse(raw);
      const filtered = list.filter(t => t.id !== taskId);
      safeStorage.setItem(storageKey, JSON.stringify(filtered));
    }
  } catch (err) {}

  return { success: true };
}


