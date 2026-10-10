/**
 * Copies every media file the database knows about from local storage (LOCAL_STORAGE_DIR) to the S3 bucket
 * configured by S3_* (e.g. Supabase Storage), keeping the same object keys so existing /media links keep working.
 * Safe to rerun: objects already in the bucket with the same size are skipped. Nothing is deleted.
 *   npm run media:copy-to-s3
 * Then set STORAGE_DRIVER="s3" and restart the app.
 */
import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { caFromEnv, pgOptions } from "../lib/db-ssl";

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required (see .env.example, Media storage).`);
  return v;
};

const prisma = new PrismaClient({ adapter: new PrismaPg(pgOptions(required("DATABASE_URL"), caFromEnv(process.env))) });
const s3 = new S3Client({
  region: required("S3_REGION"),
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  credentials: { accessKeyId: required("S3_ACCESS_KEY_ID"), secretAccessKey: required("S3_SECRET_ACCESS_KEY") },
});
const Bucket = required("S3_BUCKET");
const localDir = path.resolve(process.env.LOCAL_STORAGE_DIR || "./storage/uploads");

async function remoteSize(Key: string) {
  try {
    return (await s3.send(new HeadObjectCommand({ Bucket, Key }))).ContentLength ?? null;
  } catch (e) {
    const status = (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw e;
  }
}

async function main() {
  const assets = await prisma.mediaAsset.findMany({ select: { objectKey: true, mimeType: true, fileName: true } });
  let copied = 0;
  let skipped = 0;
  const missing: string[] = [];
  for (const a of assets) {
    const file = path.join(localDir, a.objectKey);
    const size = await stat(file).then((s) => s.size).catch(() => null);
    if (size === null) {
      missing.push(`${a.objectKey} (${a.fileName})`);
      continue;
    }
    if ((await remoteSize(a.objectKey)) === size) {
      skipped++;
      continue;
    }
    await s3.send(new PutObjectCommand({ Bucket, Key: a.objectKey, Body: await readFile(file), ContentType: a.mimeType }));
    if ((await remoteSize(a.objectKey)) !== size) throw new Error(`Upload verification failed for ${a.objectKey}`);
    copied++;
    console.log(`copied ${a.objectKey} (${a.fileName})`);
  }
  console.log(`Done: ${copied} copied, ${skipped} already in bucket, ${missing.length} missing locally.`);
  if (missing.length) {
    console.log(`Not found in ${localDir}:\n  ${missing.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
