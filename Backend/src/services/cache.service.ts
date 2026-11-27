import redis from "../config/redis";

/**
 * Default TTLs (in seconds) by data volatility.
 */
export const CacheTTL = {
  SHORT: 300, // 5 minutes: document lists, study plans, analytics
  DOCUMENT: 600, // 10 minutes: single document & study space metadata
  AI_CONTENT: 1800, // 30 minutes: quizzes, summaries, flashcards, mindmaps, module/task content
} as const;

/**
 * Centralized Redis key builders so reads and invalidations stay consistent.
 */
export const CacheKeys = {
  docDetails: (docId: string) => `doc:${docId}:details`,
  docQuizzes: (docId: string) => `doc:${docId}:quizzes`,
  docSummaries: (docId: string) => `doc:${docId}:summaries`,
  docFlashcards: (docId: string) => `doc:${docId}:flashcards`,
  docMindMaps: (docId: string) => `doc:${docId}:mindmaps`,
  userDocs: (userId: string) => `docs:user:${userId}`,
  dashboardAnalytics: (userId: string) => `analytics:dashboard:${userId}`,
  docAnalytics: (userId: string, docId: string) => `analytics:doc:${userId}:${docId}`,
  userStudyPlans: (userId: string) => `studyplans:user:${userId}`,
  studyPlanTask: (userId: string, planId: string, taskId: string) =>
    `studyplan:${userId}:${planId}:task:${taskId}`,
  userStudySpaces: (userId: string) => `studyspaces:user:${userId}`,
  studySpace: (userId: string, spaceId: string) => `studyspace:${userId}:${spaceId}`,
  studySpaceModule: (userId: string, spaceId: string, moduleId: string) =>
    `studyspace:${userId}:${spaceId}:module:${moduleId}`,
};

export class CacheService {
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      return await redis.get<T>(key);
    } catch (error) {
      console.error("Redis GET error:", error);
      return null;
    }
  }

  static async set(
    key: string,
    data: unknown,
    ttl: number = CacheTTL.SHORT
  ): Promise<void> {
    if (!redis) return;
    try {
      await redis.set(key, data, { ex: ttl });
    } catch (error) {
      console.error("Redis SET error:", error);
    }
  }

  static async delete(key: string): Promise<void> {
    if (!redis) return;
    try {
      await redis.del(key);
    } catch (error) {
      console.error("Redis DELETE error:", error);
    }
  }

  static async deleteMany(keys: string[]): Promise<void> {
    if (!redis || keys.length === 0) return;
    try {
      await redis.del(...keys);
    } catch (error) {
      console.error("Redis DELETE MANY error:", error);
    }
  }

  static async deleteByPrefix(prefix: string): Promise<void> {
    if (!redis) return;
    try {
      let cursor: string = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          { match: `${prefix}*`, count: 100 }
        );
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        cursor = String(nextCursor);
      } while (cursor !== "0");
    } catch (error) {
      console.error("Redis DELETE BY PREFIX error:", error);
    }
  }

  /**
   * Invalidates derived document views and user analytics after document content changes.
   */
  static async invalidateDocumentDerived(docId: string, userId?: string): Promise<void> {
    const keys = [CacheKeys.docDetails(docId)];
    if (userId) {
      keys.push(
        CacheKeys.userDocs(userId),
        CacheKeys.dashboardAnalytics(userId),
        CacheKeys.docAnalytics(userId, docId)
      );
    }
    await CacheService.deleteMany(keys);
  }

  /**
   * Invalidates all cached data associated with a deleted document.
   */
  static async invalidateAllForDocument(docId: string, userId?: string): Promise<void> {
    const keys = [
      CacheKeys.docDetails(docId),
      CacheKeys.docQuizzes(docId),
      CacheKeys.docSummaries(docId),
      CacheKeys.docFlashcards(docId),
      CacheKeys.docMindMaps(docId),
    ];
    if (userId) {
      keys.push(
        CacheKeys.userDocs(userId),
        CacheKeys.dashboardAnalytics(userId),
        CacheKeys.docAnalytics(userId, docId)
      );
    }
    await CacheService.deleteMany(keys);
  }
}