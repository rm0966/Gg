import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "./logger";

const DATA_ROOT = path.resolve(
  process.env.MASARI_DATA_DIR ?? path.join(process.cwd(), "data", "masari"),
);
const OWNER_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface DiscoveryRecord {
  id: string;
  assessmentId: string;
  assessmentTitleAr: string;
  assessmentTitleEn: string;
  group: "self" | "future" | "abilities";
  language: "ar" | "en";
  summary: string;
  createdAt: string;
  answers: Array<{
    questionId: string;
    promptAr: string;
    promptEn: string;
    answerValue: string;
    answerLabelAr: string;
    answerLabelEn: string;
  }>;
  report: {
    summary: string;
    observedPatterns: string[];
    strengths: string[];
    motivations: string[];
    values: string[];
    possibleTensions: string[];
    recommendations: Array<{
      title: string;
      whyItMayFit: string;
      practicalNextSteps: string[];
    }>;
    nextSteps: string[];
    uncertaintyNote: string;
  };
}

export function isValidOwnerToken(token: string): boolean {
  return OWNER_TOKEN_PATTERN.test(token);
}

function ownerDirectory(ownerToken: string): string {
  const ownerHash = createHash("sha256").update(ownerToken).digest("hex");
  return path.join(DATA_ROOT, ownerHash);
}

function filePath(ownerToken: string, id: string): string | null {
  if (!UUID_PATTERN.test(id)) return null;
  return path.join(ownerDirectory(ownerToken), `${id}.json`);
}

function isDiscoveryRecord(value: unknown): value is DiscoveryRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DiscoveryRecord>;
  return (
    typeof record.id === "string" &&
    UUID_PATTERN.test(record.id) &&
    typeof record.assessmentId === "string" &&
    (record.group === "self" ||
      record.group === "future" ||
      record.group === "abilities") &&
    (record.language === "ar" || record.language === "en") &&
    typeof record.summary === "string" &&
    typeof record.createdAt === "string" &&
    Array.isArray(record.answers) &&
    Boolean(record.report && typeof record.report === "object")
  );
}

async function ensureOwnerDirectory(ownerToken: string): Promise<string> {
  const directory = ownerDirectory(ownerToken);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  return directory;
}

async function readRecord(
  ownerToken: string,
  id: string,
): Promise<DiscoveryRecord | null> {
  const target = filePath(ownerToken, id);
  if (!target) return null;
  try {
    const parsed: unknown = JSON.parse(await readFile(target, "utf8"));
    return isDiscoveryRecord(parsed) && parsed.id === id ? parsed : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn({ recordId: id }, "Unable to read saved discovery");
    }
    return null;
  }
}

export async function listDiscoveries(
  ownerToken: string,
): Promise<DiscoveryRecord[]> {
  const directory = await ensureOwnerDirectory(ownerToken);
  const entries = await readdir(directory, { withFileTypes: true });
  const records: DiscoveryRecord[] = [];

  for (const entry of entries) {
    const match = entry.isFile() && entry.name.endsWith(".json")
      ? entry.name.slice(0, -5)
      : "";
    if (!UUID_PATTERN.test(match)) continue;

    const record = await readRecord(ownerToken, match);
    if (record) {
      records.push(record);
    } else {
      logger.warn({ recordId: match }, "Skipping malformed saved discovery");
    }
  }

  return records.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function getDiscovery(
  ownerToken: string,
  id: string,
): Promise<DiscoveryRecord | null> {
  await ensureOwnerDirectory(ownerToken);
  return readRecord(ownerToken, id);
}

export async function saveDiscovery(
  ownerToken: string,
  input: Omit<DiscoveryRecord, "id" | "createdAt">,
): Promise<DiscoveryRecord> {
  const directory = await ensureOwnerDirectory(ownerToken);
  const id = randomUUID();
  const record: DiscoveryRecord = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
  };
  const target = path.join(directory, `${id}.json`);
  const temporary = path.join(directory, `.${id}.${randomUUID()}.tmp`);

  try {
    await writeFile(temporary, JSON.stringify(record), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }

  return record;
}

export async function deleteDiscovery(
  ownerToken: string,
  id: string,
): Promise<boolean> {
  await ensureOwnerDirectory(ownerToken);
  const target = filePath(ownerToken, id);
  if (!target) return false;

  try {
    await rm(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
