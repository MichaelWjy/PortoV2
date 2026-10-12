/** Admin sessions end this many seconds after sign-in, whatever the activity; the admin then signs in again. */
export const SESSION_MAX_AGE = 10 * 60;

/** True while a session that started at `loginAt` (epoch seconds) is still inside its fixed lifetime. */
export const sessionIsFresh = (loginAt: unknown, now = Date.now()) =>
  typeof loginAt === "number" && now / 1000 - loginAt < SESSION_MAX_AGE;
