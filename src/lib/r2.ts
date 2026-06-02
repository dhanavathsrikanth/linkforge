import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "";
const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET || "linkforge-assets";

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
  });
}

export function r2Key(assetId: string, filename: string): string {
  return `gallery/${assetId}/${filename}`;
}

export async function uploadToR2(
  assetId: string,
  filename: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const key = r2Key(assetId, filename);
  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function uploadToR2WithKey(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getFromR2(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const result = await getClient().send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    );
    const body = await result.Body?.transformToByteArray();
    if (!body) return null;
    return { body, contentType: result.ContentType || "application/octet-stream" };
  } catch (e: any) {
    if (e.name === "NoSuchKey") return null;
    throw e;
  }
}

export async function deleteFromR2(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })
  );
}

export function r2PublicUrl(key: string): string {
  const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;
  if (publicDomain) return `https://${publicDomain}/${key}`;
  return `/api/gallery/proxy/${key}`;
}
