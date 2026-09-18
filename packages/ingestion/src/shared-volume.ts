import { chmodSync, chownSync, statSync } from "node:fs";

/**
 * Handing files to the web container without opening them to the host.
 *
 * The two containers share /data but not a user: the worker runs as root
 * (Playwright's image) and the web app as `nextjs` (pinned to 1001 in the
 * Dockerfile, precisely so this number means something). Anything the worker
 * writes is therefore root-owned and invisible to the reader unless somebody
 * says otherwise.
 *
 * The first version of this said "otherwise" with 0o666 and 0o777, which works
 * and is too blunt: every process on the host with the volume mounted could
 * rewrite the catalogue, and a price comparison that serves prices an attacker
 * can edit is worse than one that serves none. Group ownership expresses the
 * actual requirement — these two containers, nobody else — so that is what it
 * uses now.
 *
 * Overridable because the gid is a deployment fact, not a code fact.
 */
export const WEB_GID = Number(process.env.WEB_GID ?? 1001);

/**
 * Give `path` to the web group, or leave it alone if we are not root.
 *
 * Silent by design on failure: a developer running the crawler locally owns
 * both sides already and cannot chown to a group they are not in, and turning
 * that into an error would break `pnpm test` to fix a problem that only exists
 * in production.
 */
export function shareWithWeb(path: string, mode: number): void {
  try {
    const { uid } = statSync(path);
    chownSync(path, uid, WEB_GID);
    chmodSync(path, mode);
  } catch {
    // Not root, not on POSIX, or the file does not exist yet.
  }
}

/** Readable by the web app, writable only by the worker. */
export const READ_FOR_WEB = 0o640;

/**
 * Writable by the web app too.
 *
 * Only for the SQLite database and its sidecars. WAL has a cost that is easy to
 * miss: even a read-only connection writes, because SQLite attaches shared
 * memory through the -shm sidecar and creates it if absent. A reader without
 * write access to both the file and its directory cannot open the database at
 * all — it opens it and silently gets nothing, which is exactly how the
 * product pages 404'd while the crawler reported success.
 */
export const WRITE_FOR_WEB = 0o660;

/** Directory equivalent: traversable and writable by the group, closed to others. */
export const DIR_FOR_WEB = 0o770;
