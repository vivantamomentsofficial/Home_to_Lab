import React from 'react';

/**
 * Returns a rich FontAwesome 6 icon component customized for the given filename and mimetype.
 */
export const getFaFileIcon = (filename = '', mimeType = '', className = 'text-xl') => {
  const ext = (filename.split('.').pop() || '').toLowerCase();

  // 1. Specific Code & Tech Stacks
  if (ext === 'py') {
    return <i className={`fa-brands fa-python text-yellow-500 ${className}`} title="Python Source"></i>;
  }
  if (['js', 'mjs', 'cjs'].includes(ext)) {
    return <i className={`fa-brands fa-square-js text-yellow-400 ${className}`} title="JavaScript"></i>;
  }
  if (['ts', 'mts', 'cts'].includes(ext)) {
    return <i className={`fa-solid fa-code text-blue-400 ${className}`} title="TypeScript"></i>;
  }
  if (['jsx', 'tsx'].includes(ext)) {
    return <i className={`fa-brands fa-react text-cyan-400 ${className}`} title="React Component"></i>;
  }
  if (ext === 'java') {
    return <i className={`fa-brands fa-java text-orange-600 ${className}`} title="Java Source"></i>;
  }
  if (['html', 'htm'].includes(ext)) {
    return <i className={`fa-brands fa-html5 text-orange-500 ${className}`} title="HTML Document"></i>;
  }
  if (['css', 'scss', 'sass', 'less'].includes(ext)) {
    return <i className={`fa-brands fa-css3-alt text-blue-500 ${className}`} title="Stylesheet"></i>;
  }
  if (ext === 'php') {
    return <i className={`fa-brands fa-php text-indigo-400 ${className}`} title="PHP Source"></i>;
  }
  if (ext === 'rust' || ext === 'rs') {
    return <i className={`fa-brands fa-rust text-amber-600 ${className}`} title="Rust Source"></i>;
  }
  if (ext === 'go') {
    return <i className={`fa-brands fa-golang text-cyan-500 ${className}`} title="Go Source"></i>;
  }
  if (['c', 'cpp', 'cc', 'cxx', 'h', 'hpp'].includes(ext)) {
    return <i className={`fa-solid fa-file-code text-indigo-500 ${className}`} title="C/C++ Source"></i>;
  }
  if (['sql', 'sqlite', 'db'].includes(ext)) {
    return <i className={`fa-solid fa-database text-teal-500 ${className}`} title="Database / SQL"></i>;
  }
  if (['json', 'yaml', 'yml', 'xml'].includes(ext)) {
    return <i className={`fa-solid fa-file-code text-emerald-400 ${className}`} title="Data / Config"></i>;
  }

  // 2. Documents
  if (ext === 'pdf' || mimeType.includes('pdf')) {
    return <i className={`fa-solid fa-file-pdf text-rose-500 ${className}`} title="PDF Document"></i>;
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext)) {
    return <i className={`fa-solid fa-file-word text-blue-600 ${className}`} title="Word Document"></i>;
  }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return <i className={`fa-solid fa-file-excel text-emerald-600 ${className}`} title="Spreadsheet"></i>;
  }
  if (['ppt', 'pptx', 'odp'].includes(ext)) {
    return <i className={`fa-solid fa-file-powerpoint text-amber-600 ${className}`} title="Presentation"></i>;
  }
  if (['txt', 'log', 'env'].includes(ext) || mimeType.startsWith('text/')) {
    return <i className={`fa-solid fa-file-lines text-sky-500 ${className}`} title="Text File"></i>;
  }

  // 3. Media & Archives
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
  if (imageExts.includes(ext) || mimeType.startsWith('image/')) {
    return <i className={`fa-solid fa-file-image text-emerald-500 ${className}`} title="Image File"></i>;
  }
  const videoExts = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'];
  if (videoExts.includes(ext) || mimeType.startsWith('video/')) {
    return <i className={`fa-solid fa-file-video text-purple-500 ${className}`} title="Video Media"></i>;
  }
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
  if (audioExts.includes(ext) || mimeType.startsWith('audio/')) {
    return <i className={`fa-solid fa-file-audio text-pink-500 ${className}`} title="Audio Recording"></i>;
  }
  const zipExts = ['zip', 'rar', 'tar', 'gz', '7z', 'bz2'];
  if (zipExts.includes(ext)) {
    return <i className={`fa-solid fa-file-zipper text-amber-500 ${className}`} title="Compressed Archive"></i>;
  }

  // Fallback generic file
  return <i className={`fa-solid fa-file text-slate-400 ${className}`} title="File"></i>;
};
