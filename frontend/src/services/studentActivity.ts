/**
 * NEXORA Student Activity Tracking Service
 * Master Prompt 04B - Genuine event-driven student activity tracking.
 *
 * Core Principle: Academic activity, metrics, and progress must come from
 * real user-generated events, never fabricated or randomly populated.
 */

export interface StudentActivityItem {
  id: string;
  type: 'lesson_viewed' | 'lesson_completed' | 'quiz_completed' | 'note_created' | 'material_uploaded';
  title: string;
  subject: string;
  timestamp: string; // ISO string
  timeAgo: string;
  details?: Record<string, any>;
}

export interface ActiveCourseProgress {
  subject: string;
  slug: string;
  courseTitle: string;
  currentTopic: string;
  lastLesson: string;
  completedTopics: number;
  totalTopics: number;
  progressPercent: number;
  targetUrl: string;
}

export interface OverallStudentProgress {
  overallProgressPercent: number;
  completedLessons: number;
  completedQuizzes: number;
  activeSubjects: number;
  studyMinutes: number;
}

export interface CompletedTopicRecord {
  id: string;
  title: string;
  subject: string;
  completedOn: string;
  score?: string;
}

export interface PracticeAttemptRecord {
  id: string;
  topic: string;
  subject: string;
  score: number;
  totalQuestions: number;
  accuracy: string;
  date: string;
}

const STORAGE_KEY_ACTIVITIES = 'nexora_student_activities';
const STORAGE_KEY_COMPLETED_LESSONS = 'nexora_completed_lessons';
const STORAGE_KEY_PRACTICE_ATTEMPTS = 'nexora_practice_attempts';
const STORAGE_KEY_ACTIVE_COURSE = 'nexora_active_course';

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
}

export const studentActivityService = {
  /**
   * Retrieves all genuine student activities recorded in the workspace.
   */
  getRecentActivities(limit: number = 10): StudentActivityItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
      if (!raw) return [];
      const parsed: StudentActivityItem[] = JSON.parse(raw);
      return parsed
        .map((act) => ({
          ...act,
          timeAgo: formatTimeAgo(act.timestamp),
        }))
        .slice(0, limit);
    } catch {
      return [];
    }
  },

  /**
   * Records a genuine lesson view / interaction event.
   */
  recordLessonView(conceptSlug: string, conceptName: string, subject: string) {
    try {
      const activities = this.getRecentActivities(50);
      const newActivity: StudentActivityItem = {
        id: `act-${Date.now()}`,
        type: 'lesson_viewed',
        title: `Studied Concept: ${conceptName}`,
        subject: subject,
        timestamp: new Date().toISOString(),
        timeAgo: 'Just now',
        details: { conceptSlug, conceptName },
      };

      // Filter duplicate recent views of the same concept to keep feed clean
      const filtered = activities.filter(
        (a) => !(a.type === 'lesson_viewed' && a.details?.conceptSlug === conceptSlug)
      );
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify([newActivity, ...filtered]));

      // Update active course pointer
      const activeCourse: ActiveCourseProgress = {
        subject: subject,
        slug: subject.toLowerCase().replace(/\s+/g, '-'),
        courseTitle: subject,
        currentTopic: conceptName,
        lastLesson: conceptName,
        completedTopics: this.getCompletedLessons().filter((l) => l.subject === subject).length,
        totalTopics: 10,
        progressPercent: Math.min(
          100,
          Math.round(
            (this.getCompletedLessons().filter((l) => l.subject === subject).length / 10) * 100
          )
        ),
        targetUrl: `/learn?q=${encodeURIComponent(conceptName)}`,
      };
      localStorage.setItem(STORAGE_KEY_ACTIVE_COURSE, JSON.stringify(activeCourse));
    } catch (e) {
      console.error('Failed to record lesson view event:', e);
    }
  },

  /**
   * Records a completed lesson event when student finishes or verifies a concept.
   */
  recordLessonCompleted(conceptSlug: string, conceptName: string, subject: string, scoreNote?: string) {
    try {
      const completed = this.getCompletedLessons();
      if (!completed.some((c) => c.title === conceptName)) {
        const newRecord: CompletedTopicRecord = {
          id: `ct-${Date.now()}`,
          title: conceptName,
          subject: subject,
          completedOn: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          score: scoreNote || 'Verified Lesson',
        };
        localStorage.setItem(STORAGE_KEY_COMPLETED_LESSONS, JSON.stringify([newRecord, ...completed]));
      }

      // Record activity event
      const activities = this.getRecentActivities(50);
      const newActivity: StudentActivityItem = {
        id: `act-${Date.now()}`,
        type: 'lesson_completed',
        title: `Completed Lesson: ${conceptName}`,
        subject: subject,
        timestamp: new Date().toISOString(),
        timeAgo: 'Just now',
        details: { conceptSlug, conceptName, scoreNote },
      };
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify([newActivity, ...activities]));
    } catch (e) {
      console.error('Failed to record lesson completed:', e);
    }
  },

  /**
   * Records a genuine quiz/practice attempt with real student score.
   */
  recordQuizAttempt(topic: string, subject: string, score: number, totalQuestions: number) {
    try {
      const accuracy = `${Math.round((score / Math.max(1, totalQuestions)) * 100)}%`;
      const attempts = this.getPracticeAttempts();
      const newAttempt: PracticeAttemptRecord = {
        id: `pq-${Date.now()}`,
        topic,
        subject,
        score,
        totalQuestions,
        accuracy,
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };
      localStorage.setItem(STORAGE_KEY_PRACTICE_ATTEMPTS, JSON.stringify([newAttempt, ...attempts]));

      // Also record as general activity
      const activities = this.getRecentActivities(50);
      const newActivity: StudentActivityItem = {
        id: `act-${Date.now()}`,
        type: 'quiz_completed',
        title: `Practiced ${topic} (${score}/${totalQuestions} Correct)`,
        subject: subject,
        timestamp: new Date().toISOString(),
        timeAgo: 'Just now',
        details: { topic, score, totalQuestions, accuracy },
      };
      localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify([newActivity, ...activities]));

      // If score is high (e.g. >= 80%), mark topic as completed lesson
      if (score / totalQuestions >= 0.8) {
        this.recordLessonCompleted(topic, topic, subject, `${accuracy} Concept Verification`);
      }
    } catch (e) {
      console.error('Failed to record quiz attempt:', e);
    }
  },

  /**
   * Retrieves all completed lessons genuinely finished by the student.
   */
  getCompletedLessons(): CompletedTopicRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMPLETED_LESSONS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Checks if a topic has been completed by the student.
   */
  isTopicCompleted(topicTitle: string): boolean {
    const completed = this.getCompletedLessons();
    return completed.some((c) => c.title.toLowerCase() === topicTitle.toLowerCase());
  },

  /**
   * Retrieves all genuine practice attempts recorded by the student.
   */
  getPracticeAttempts(): PracticeAttemptRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRACTICE_ATTEMPTS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Clears the current active course from storage.
   */
  clearActiveCourse() {
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_COURSE);
    } catch (e) {
      console.error('Failed to clear active course:', e);
    }
  },

  /**
   * Clears all student activities and progress from storage.
   */
  clearActivities() {
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVITIES);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_COURSE);
      localStorage.removeItem(STORAGE_KEY_COMPLETED_LESSONS);
      localStorage.removeItem(STORAGE_KEY_PRACTICE_ATTEMPTS);
    } catch (e) {
      console.error('Failed to clear activities:', e);
    }
  },

  /**
   * Retrieves the student's active course if they have started learning.
   * Returns null if the student has not yet started any course or if stored
   * course belongs to an mismatched education tier.
   */
  getActiveCourse(educationCategory?: string): ActiveCourseProgress | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_COURSE);
      if (!raw) return null;
      const parsed: ActiveCourseProgress = JSON.parse(raw);

      // Verify course matches the student's active education level
      if (educationCategory) {
        const cat = educationCategory.toLowerCase();
        const isK12 = cat.includes('primary') || cat.includes('class-1-5') || cat.includes('class-6-10') || cat.includes('secondary');
        const isCSE = /computer|data structure|algorithm|operating system|network|database|artificial intelligence/i.test(
          parsed.subject || parsed.courseTitle || ''
        );
        if (isK12 && isCSE) {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_COURSE);
          return null;
        }
      }

      // Recalculate completed topics from real completed lessons
      const completed = this.getCompletedLessons().filter((l) => l.subject === parsed.subject).length;
      parsed.completedTopics = completed;
      parsed.progressPercent = Math.min(100, Math.round((completed / parsed.totalTopics) * 100));
      return parsed;
    } catch {
      return null;
    }
  },

  /**
   * Derives overall progress statistics from genuine student records.
   * Returns 0s if no records exist.
   */
  getOverallProgress(): OverallStudentProgress {
    const completedLessons = this.getCompletedLessons();
    const practiceAttempts = this.getPracticeAttempts();

    const distinctSubjects = new Set([
      ...completedLessons.map((l) => l.subject),
      ...practiceAttempts.map((p) => p.subject),
    ]);

    const completedCount = completedLessons.length;
    const quizCount = practiceAttempts.length;

    // Approximate study minutes derived from actual completed lessons (~20 mins each) and quizzes (~5 mins each)
    const studyMinutes = completedCount * 20 + quizCount * 5;

    // Standard baseline: 4 core subjects with ~10 foundational topics each (40 topics total)
    const totalCurriculumTopics = 40;
    const overallProgressPercent = Math.min(100, Math.round((completedCount / totalCurriculumTopics) * 100));

    return {
      overallProgressPercent,
      completedLessons: completedCount,
      completedQuizzes: quizCount,
      activeSubjects: distinctSubjects.size,
      studyMinutes,
    };
  },
};
