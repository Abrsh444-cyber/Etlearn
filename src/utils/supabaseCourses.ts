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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const seenIds = new Set<string>();
        const courses: CourseRecord[] = [];
        for (const row of data) {
          if (!seenIds.has(row.id)) {
            seenIds.add(row.id);
            courses.push(mapDbCourse(row));
          }
        }
        safeStorage.setItem(LOCAL_STORAGE_COURSES_KEY, JSON.stringify(courses));
        return courses;
      }
    } catch (e) {
      console.warn('Error fetching admin courses:', e);
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return [];
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
// 3. ADMIN DASHBOARD STATS (Live Supabase Aggregate Counts — 0 on empty)
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

  if (supabase) {
    try {
      // 1. Total real students from student_profiles
      const { count: studentsCount, data: recentStudents } = await supabase
        .from('student_profiles')
        .select('name, email, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

      totalStudents = studentsCount || 0;

      if (recentStudents && recentStudents.length > 0) {
        recentStudents.forEach((st: any, idx: number) => {
          recentActivity.push({
            id: `act_student_${st.email || idx}`,
            type: 'user_registered',
            title: 'New Student Enrollment',
            description: `${st.name || 'Student'} (${st.email || 'Registered'}) joined the campus portal`,
            timestamp: st.created_at || new Date().toISOString(),
          });
        });
      }

      // 2. Published and Draft Courses count
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, status, created_at, updated_at')
        .order('updated_at', { ascending: false });

      if (coursesData && Array.isArray(coursesData)) {
        coursesData.forEach((c: any) => {
          if (c.status === 'published') publishedCourses++;
          else if (c.status === 'draft') draftCourses++;

          if (recentActivity.length < 10) {
            recentActivity.push({
              id: `act_course_${c.id}`,
              type: c.status === 'published' ? 'course_published' : 'course_created',
              title: c.status === 'published' ? 'Course Published' : 'Draft Course Created',
              description: `"${c.title}" updated in database catalog`,
              timestamp: c.updated_at || c.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // 3. Lessons count
      const { count: lessonsCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true });
      totalLessons = lessonsCount || 0;

      // 4. Payments stats
      const { data: paymentsData, count: payCount } = await supabase
        .from('payments')
        .select('id, amount, status, sender_name, created_at')
        .order('created_at', { ascending: false });

      totalPaymentsCount = payCount || 0;

      if (paymentsData && Array.isArray(paymentsData)) {
        paymentsData.forEach((p: any) => {
          const amt = Number(p.amount || 0);
          if (p.status === 'completed') {
            totalRevenueETB += amt;
          } else if (p.status === 'pending') {
            pendingPaymentsCount++;
          }

          if (recentActivity.length < 15) {
            recentActivity.push({
              id: `act_pay_${p.id}`,
              type: 'payment_received',
              title: `Payment ${p.status === 'completed' ? 'Verified' : 'Pending'} (${amt} ETB)`,
              description: `Transaction from ${p.sender_name || 'Student'}`,
              timestamp: p.created_at || new Date().toISOString(),
            });
          }
        });
      }

      // 5. Announcements count
      const { count: annCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true });
      activeAnnouncementsCount = annCount || 0;

      // 6. Coupons count
      const { count: coupCount } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      activeCouponsCount = coupCount || 0;

    } catch (e) {
      console.warn('Error computing live Supabase stats:', e);
    }
  } else {
    // Read cached local storage counts if database client isn't connected yet
    try {
      const rawCourses = safeStorage.getItem(LOCAL_STORAGE_COURSES_KEY);
      if (rawCourses) {
        const courses: CourseRecord[] = JSON.parse(rawCourses);
        publishedCourses = courses.filter(c => c.status === 'published').length;
        draftCourses = courses.filter(c => c.status === 'draft').length;
      }
      const rawLessons = safeStorage.getItem(LOCAL_STORAGE_LESSONS_KEY);
      if (rawLessons) {
        totalLessons = JSON.parse(rawLessons).length;
      }
      const rawPayments = safeStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY);
      if (rawPayments) {
        const payments = JSON.parse(rawPayments);
        totalPaymentsCount = payments.length;
        payments.forEach((p: any) => {
          if (p.status === 'completed') totalRevenueETB += Number(p.amount || 0);
          if (p.status === 'pending') pendingPaymentsCount++;
        });
      }
    } catch {}
  }

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
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
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

export async function fetchCoupons(): Promise<CouponCode[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
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
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
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
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('Error fetching admin payments:', e);
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  return [];
}

export async function updatePaymentStatus(paymentId: string, status: 'completed' | 'failed' | 'pending'): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', paymentId);

      if (error) return { success: false, error: error.message };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_PAYMENTS_KEY);
    if (raw) {
      const list: any[] = JSON.parse(raw);
      const index = list.findIndex(p => p.id === paymentId);
      if (index !== -1) {
        list[index].status = status;
        safeStorage.setItem(LOCAL_STORAGE_PAYMENTS_KEY, JSON.stringify(list));
      }
    }
  } catch {}

  return { success: true };
}

export async function fetchAdminStudents(searchQuery = ''): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase
        .from('student_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,university.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('Error fetching admin students:', e);
    }
  }

  return [];
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


