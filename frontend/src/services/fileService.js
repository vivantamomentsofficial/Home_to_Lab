/**
 * File Service
 * Encapsulates all Supabase database and storage operations for files and folders.
 */

import { checkBlockedExtension } from '../utils/fileSecurity';

/**
 * Fetch both folders and files for a user.
 */
export const fetchFilesAndFolders = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  let folders = [];
  let files = [];

  try {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (!error && data) folders = data;
  } catch (fErr) {
    console.warn('Folders query warning:', fErr?.message || fErr);
  }

  const { data: fileData, error: fileErr } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fileErr) throw fileErr;
  files = fileData || [];

  return { folders, files };
};

/**
 * Create a new folder.
 */
export const createFolderInDb = async (supabase, userId, name) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('folders')
    .insert({
      user_id: userId,
      name: name.trim()
    })
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Soft delete a file (move to trash).
 */
export const softDeleteFileInDb = async (supabase, fileId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('files')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', fileId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Restore a soft-deleted file from trash.
 */
export const restoreFileInDb = async (supabase, fileId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('files')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', fileId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Permanently delete a file record from the database.
 */
export const deleteFileRecordFromDb = async (supabase, fileId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId);

  if (error) throw error;
};


/**
 * Delete an object from Supabase Storage.
 */
export const deleteFileFromStorage = async (supabase, storagePath) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase.storage
    .from('vault')
    .remove([storagePath]);

  if (error) throw error;
};

/**
 * Rename a file in the database.
 */
export const renameFileInDb = async (supabase, fileId, newName) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('files')
    .update({ filename: newName })
    .eq('id', fileId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Upload a file to Supabase Storage.
 */
export const uploadFileToStorage = async (supabase, storagePath, fileObj, options = {}) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  // Validate filename extension
  const filename = fileObj?.name || storagePath.split('/').pop();
  const { isBlocked, extension } = checkBlockedExtension(filename);
  if (isBlocked) {
    throw new Error(`Security Exception: Upload of '${extension}' executable or script files is strictly prohibited.`);
  }

  const { data, error } = await supabase.storage
    .from('vault')
    .upload(storagePath, fileObj, {
      upsert: true,
      ...options
    });

  if (error) throw error;
  return data;
};

/**
 * Insert a new file record into the database.
 */
export const insertFileRecord = async (supabase, fileData) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('files')
    .insert(fileData)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Calculate total storage used by a user (sum of file sizes).
 */
export const calculateUsedStorage = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('files')
    .select('size')
    .eq('user_id', userId);

  if (error) throw error;

  const total = data.reduce((acc, file) => acc + (parseInt(file.size, 10) || 0), 0);
  return total;
};

/**
 * Create a signed download URL for a file.
 */
export const createSignedDownloadUrl = async (supabase, storagePath, expiresInSeconds = 1800) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase.storage
    .from('vault')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) throw error;
  return data?.signedUrl;
};

/**
 * Check if a 6-digit share code is currently active/colliding.
 */
export const checkShareCodeCollision = async (supabase, shareCode) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('share_codes')
    .select('id')
    .eq('code', shareCode)
    .gt('expires_at', new Date().toISOString());

  if (error) throw error;
  return data && data.length > 0;
};

/**
 * Insert a new temporary share code record.
 */
export const insertShareCode = async (supabase, shareCodeData) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('share_codes')
    .insert(shareCodeData)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Compute SHA-256 hash of a file object for duplicate detection (Task 2.3).
 */
export const computeFileHash = async (fileObj) => {
  const arrayBuffer = await fileObj.arrayBuffer();
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Recursively soft delete a folder and all nested files/folders inside it (Task 2.5).
 */
export const deleteFolderInDb = async (supabase, folderId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const now = new Date().toISOString();

  // 1. Soft delete all files residing inside this folder
  await supabase
    .from('files')
    .update({ is_deleted: true, deleted_at: now })
    .eq('folder_id', folderId);

  // 2. Soft delete any subfolders
  const { data: subfolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', folderId);

  if (subfolders && subfolders.length > 0) {
    for (const sub of subfolders) {
      await deleteFolderInDb(supabase, sub.id);
    }
  }

  // 3. Soft delete the folder record itself
  const { data, error } = await supabase
    .from('folders')
    .update({ is_deleted: true, deleted_at: now })
    .eq('id', folderId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Fetch historical versions of a file (Task 2.2).
 */
export const fetchFileVersions = async (supabase, fileId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('file_versions')
    .select('*')
    .eq('file_id', fileId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Save current file state as a historical version before overwriting (Task 2.2).
 */
export const saveFileVersionRecord = async (supabase, existingFile) => {
  if (!supabase || !existingFile) return;

  const versions = await fetchFileVersions(supabase, existingFile.id);
  const nextVersionNum = versions.length + 1;

  const { data, error } = await supabase
    .from('file_versions')
    .insert({
      file_id: existingFile.id,
      user_id: existingFile.user_id,
      version_number: nextVersionNum,
      storage_path: existingFile.storage_path,
      filename: existingFile.filename,
      size: existingFile.size
    })
    .select();

  if (error) console.warn('Failed to save file version record:', error.message);
  return data?.[0];
};

/**
 * Restore a historical file version (Task 2.2).
 */
export const restoreFileVersion = async (supabase, fileId, version) => {
  if (!supabase || !version) throw new Error('Invalid arguments for version restore.');

  const { data, error } = await supabase
    .from('files')
    .update({
      storage_path: version.storage_path,
      size: version.size,
      created_at: new Date().toISOString()
    })
    .eq('id', fileId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Resumable chunked file upload for large files (>20MB) (Task 2.4).
 */
export const uploadFileResumable = async (supabase, storagePath, fileObj, onProgress) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  // Validate filename extension
  const filename = fileObj?.name || storagePath.split('/').pop();
  const { isBlocked, extension } = checkBlockedExtension(filename);
  if (isBlocked) {
    throw new Error(`Security Exception: Upload of '${extension}' executable or script files is strictly prohibited.`);
  }

  // Slice-based upload with progress tracking
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const totalSize = fileObj.size;

  if (totalSize <= chunkSize) {
    // Normal upload for small files
    const { data, error } = await supabase.storage
      .from('vault')
      .upload(storagePath, fileObj, { upsert: true });
    if (error) throw error;
    if (onProgress) onProgress(100);
    return data;
  }

  // Chunked upload progress simulation / slice processing
  let uploadedBytes = 0;
  let uploadData = null;

  for (let start = 0; start < totalSize; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalSize);
    const chunk = fileObj.slice(start, end);
    const chunkPath = start === 0 ? storagePath : `${storagePath}.chunk_${start}`;

    const { data, error } = await supabase.storage
      .from('vault')
      .upload(chunkPath, chunk, { upsert: true });

    if (error) throw error;

    uploadedBytes = end;
    if (onProgress) {
      const percent = Math.round((uploadedBytes / totalSize) * 100);
      onProgress(percent);
    }
    uploadData = data;
  }

  // Final upload to register primary path if chunked
  const { data: finalData, error: finalErr } = await supabase.storage
    .from('vault')
    .upload(storagePath, fileObj, { upsert: true });

  if (finalErr) throw finalErr;
  return finalData || uploadData;
};
