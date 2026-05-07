import { objectStorageClient } from "./objectStorage";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";

export async function uploadBufferToGCS(
  buffer: Buffer,
  folder: string,
  filename: string,
  contentType: string
): Promise<string> {
  const gcsPath = `uploads/${folder}/${filename}`;
  const bucket = objectStorageClient.bucket(BUCKET_ID);
  const file = bucket.file(gcsPath);

  await file.save(buffer, {
    metadata: { contentType },
    resumable: false,
  });

  return `/storage/objects/${gcsPath}`;
}

export async function deleteGCSObject(gcsPath: string): Promise<boolean> {
  const bucket = objectStorageClient.bucket(BUCKET_ID);
  const file = bucket.file(gcsPath);
  const [exists] = await file.exists();
  if (!exists) return false;
  await file.delete();
  return true;
}

export async function serveGCSObject(gcsPath: string) {
  const bucket = objectStorageClient.bucket(BUCKET_ID);
  const file = bucket.file(gcsPath);

  const [exists] = await file.exists();
  if (!exists) return null;

  const [metadata] = await file.getMetadata();
  const [contents] = await file.download();

  return {
    buffer: contents,
    contentType: (metadata.contentType as string) || "application/octet-stream",
  };
}
