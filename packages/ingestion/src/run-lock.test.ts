import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { acquireLock } from "./run-lock";

test("een tweede run wacht niet en schrijft niet mee", () => {
  const path = join(mkdtempSync(join(tmpdir(), "lock-")), "ingest.lock");
  const release = acquireLock(path);
  expect(release).not.toBeNull();
  expect(acquireLock(path)).toBeNull();
  release!();
  expect(acquireLock(path)).not.toBeNull();
});

test("een lock van een proces dat niet meer bestaat wordt overgenomen", () => {
  const path = join(mkdtempSync(join(tmpdir(), "lock-")), "ingest.lock");
  writeFileSync(path, JSON.stringify({ pid: 999_999_999, at: Date.now() }));
  expect(acquireLock(path)).not.toBeNull();
});

test("een oeroude lock wordt overgenomen, ook als het proces nog bestaat", () => {
  const path = join(mkdtempSync(join(tmpdir(), "lock-")), "ingest.lock");
  writeFileSync(path, JSON.stringify({ pid: process.pid, at: Date.now() - 4 * 3_600_000 }));
  expect(acquireLock(path)).not.toBeNull();
});
