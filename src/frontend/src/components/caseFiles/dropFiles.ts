export async function extractFilesFromDropEvent(e: React.DragEvent): Promise<File[]> {
  const items = e.dataTransfer.items;
  if (!items || items.length === 0) {
    return Array.from(e.dataTransfer.files || []);
  }
  const files: File[] = [];
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        entries.push(entry);
      } else {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
  }

  async function readEntry(entry: FileSystemEntry | null): Promise<void> {
    if (!entry) return;
    if (entry.isFile) {
      try {
        const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
        if (file) files.push(file);
      } catch {
        // ignore unreadable file
      }
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const readBatch = () =>
        new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
      let batch: FileSystemEntry[] = [];
      do {
        try {
          batch = await readBatch();
          for (const child of batch) {
            await readEntry(child);
          }
        } catch {
          batch = [];
        }
      } while (batch.length > 0);
    }
  }

  for (const entry of entries) {
    await readEntry(entry);
  }
  return files;
}
