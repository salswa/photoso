/**
 * fileSystem.js
 * All File System Access API interactions.
 */

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export async function pickFolder() {
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

/**
 * Reads all supported image file handles from a directory.
 * Returns array of { name, handle } sorted by natural filename order.
 */
export async function readImageFiles(dirHandle) {
  const files = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind !== 'file') continue;
    const name = entry.name.toLowerCase();
    if (SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext))) {
      files.push({ name: entry.name, handle: entry });
    }
  }
  files.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
  return files;
}

/**
 * Fetches a fresh file handle from a directory by filename.
 * Always use this before any move — old handles go stale after moving.
 */
export async function getFileHandleFromDir(dirHandle, filename) {
  return await dirHandle.getFileHandle(filename);
}

/**
 * Moves a file from src to dest directory by filename.
 * Fetches a fresh handle from src before moving.
 */
export async function moveFileByName(filename, srcDirHandle, destDirHandle) {
  const handle = await getFileHandleFromDir(srcDirHandle, filename);
  const file = await handle.getFile();
  const destHandle = await destDirHandle.getFileHandle(filename, { create: true });
  const writable = await destHandle.createWritable();
  await writable.write(file);
  await writable.close();
  await srcDirHandle.removeEntry(filename);
}

/**
 * Checks if a directory has any supported image files.
 */
export async function dirHasImages(dirHandle) {
  for await (const entry of dirHandle.values()) {
    if (entry.kind !== 'file') continue;
    const name = entry.name.toLowerCase();
    if (SUPPORTED_EXTENSIONS.some(ext => name.endsWith(ext))) return true;
  }
  return false;
}
