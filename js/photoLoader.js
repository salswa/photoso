/**
 * photoLoader.js
 * Loads images from a given directory handle by filename.
 * Cache keyed by filename.
 */

const urlCache = new Map(); // filename -> objectURL

/**
 * Gets object URL for a file by name from a specific directory.
 * @param {string} filename
 * @param {FileSystemDirectoryHandle} dirHandle
 * @returns {Promise<string>}
 */
export async function getPhotoUrl(filename, dirHandle) {
  if (urlCache.has(filename)) return urlCache.get(filename);
  const fileHandle = await dirHandle.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const url = URL.createObjectURL(file);
  urlCache.set(filename, url);
  return url;
}

export function revokePhotoUrl(filename) {
  if (urlCache.has(filename)) {
    URL.revokeObjectURL(urlCache.get(filename));
    urlCache.delete(filename);
  }
}

export function clearCache() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}
