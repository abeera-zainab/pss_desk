import { api } from "../../lib/api";

const blobs = new Map<string, Promise<Blob>>();

export function getCachedFileBlob(fileId: string): Promise<Blob> {
  let pending = blobs.get(fileId);
  if (!pending) {
    pending = api.getFileBlob(fileId);
    blobs.set(fileId, pending);
    pending.catch(() => {
      blobs.delete(fileId);
    });
  }
  return pending;
}

export function invalidateFileBlob(fileId: string) {
  blobs.delete(fileId);
}
