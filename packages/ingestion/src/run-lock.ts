import { closeSync, openSync, readFileSync, unlinkSync, writeSync } from "node:fs";

/**
 * One ingest at a time.
 *
 * A deploy restarts the worker (which ingests on start) and then runs an
 * explicit refresh with `docker exec` — two processes, one volume. On 25
 * September they collided: both wrote offers-archive.json.tmp, one renamed it
 * away, and the other's rename failed with ENOENT. The atomic write protects a
 * reader from a half-written file; it does not protect two writers from each
 * other. A lock file does.
 *
 * A lock older than `STALE_MS`, or held by a process that no longer exists, is
 * taken over — a worker killed mid-run must not block every run after it.
 */
const STALE_MS = 3 * 3_600_000;

export function acquireLock(path: string, now = Date.now()): (() => void) | null {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(path, "wx");
      writeSync(fd, JSON.stringify({ pid: process.pid, at: now }));
      closeSync(fd);
      return () => {
        try {
          unlinkSync(path);
        } catch {
          // Already gone; nothing to release.
        }
      };
    } catch {
      if (!isStale(path, now)) return null;
      try {
        unlinkSync(path);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function isStale(path: string, now: number): boolean {
  try {
    const { pid, at } = JSON.parse(readFileSync(path, "utf-8")) as { pid: number; at: number };
    if (now - at > STALE_MS) return true;
    try {
      process.kill(pid, 0); // throws when no such process
      return false;
    } catch {
      return true;
    }
  } catch {
    return true; // unreadable lock: treat as abandoned
  }
}
