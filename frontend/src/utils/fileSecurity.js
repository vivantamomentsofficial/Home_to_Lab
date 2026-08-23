/**
 * Security validation utility for files and uploads in CloudVault.
 * Blocks dangerous executable, script, and macro file formats from being uploaded or distributed.
 */

export const BLOCKED_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.bash',
  '.ps1',
  '.vbs',
  '.msi',
  '.scr',
  '.jar',
  '.com',
  '.pif',
  '.hta',
  '.cpl',
  '.apk',
  '.gadget',
  '.wsf'
];

/**
 * Check if a filename has a prohibited dangerous extension.
 * @param {string} filename 
 * @returns {{ isBlocked: boolean, extension: string }}
 */
export function checkBlockedExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return { isBlocked: false, extension: '' };
  }

  const lowerName = filename.toLowerCase().trim();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      return { isBlocked: true, extension: ext };
    }
  }

  return { isBlocked: false, extension: '' };
}

/**
 * Classify file category for storage breakdown visualization and previews.
 * @param {string} filename 
 * @param {string} mimeType 
 * @returns {'images' | 'documents' | 'audio' | 'video' | 'code' | 'archives' | 'other'}
 */
export function getFileCategory(filename, mimeType = '') {
  const lower = (filename || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)$/.test(lower)
  ) {
    return 'images';
  }

  if (
    mime.startsWith('video/') ||
    /\.(mp4|webm|mov|mkv|avi|wmv|flv)$/.test(lower)
  ) {
    return 'video';
  }

  if (
    mime.startsWith('audio/') ||
    /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/.test(lower)
  ) {
    return 'audio';
  }

  if (
    mime === 'application/pdf' ||
    /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|rtf|epub|odt)$/.test(lower)
  ) {
    return 'documents';
  }

  if (
    /\.(js|jsx|ts|tsx|py|html|css|json|sql|c|cpp|h|java|php|rb|go|rs|sh|md|yaml|yml|xml)$/.test(lower)
  ) {
    return 'code';
  }

  if (/\.(zip|tar|gz|rar|7z|bz2|xz)$/.test(lower)) {
    return 'archives';
  }

  return 'other';
}
