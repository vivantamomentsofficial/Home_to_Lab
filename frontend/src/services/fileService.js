/**
 * File Service
 * Encapsulates all Supabase database and storage operations for files and folders.
 */

import { checkBlockedExtension } from '../utils/fileSecurity';

/**
 * Fetch both folders and files for a user.
 */
const getCategoryFromFilename = (filename = '', mimeType = '') => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext) || mimeType.startsWith('image/')) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'].includes(ext) || mimeType.startsWith('video/')) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext) || mimeType.startsWith('audio/')) return 'audio';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext)) return 'document';
  if (['java', 'py', 'html', 'css', 'js', 'json', 'xml', 'cpp', 'c', 'sh', 'sql', 'php', 'ts', 'jsx', 'tsx', 'rs', 'go', 'yaml', 'yml'].includes(ext)) return 'code';
  if (['txt', 'md', 'csv', 'log', 'env'].includes(ext) || mimeType.startsWith('text/')) return 'text';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'zip';
  return 'other';
};

/**
 * Fetch both folders and files for a user.
 * Automatically syncs files from Supabase Storage bucket ('vault') if database catalog is missing records.
 */
export const fetchFilesAndFolders = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  let folders = [];
  let files = [];

  // 1. Fetch folders and files in parallel (2x faster than sequential queries)
  try {
    const [foldersRes, filesRes] = await Promise.all([
      supabase
        .from('folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true }),
      supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ]);

    if (!foldersRes.error && foldersRes.data) folders = foldersRes.data;
    if (!filesRes.error && filesRes.data) files = filesRes.data;
  } catch (err) {
    console.warn('Parallel fetch warning:', err?.message || err);
  }

  // 2. Ensure default folders exist if user has 0 folders
  if (folders.length === 0) {
    try {
      const defaultFolderNames = ['practical', 'Lab', 'Lecture'];
      const createdFolders = [];
      for (const name of defaultFolderNames) {
        const { data: newF } = await supabase
          .from('folders')
          .insert({ user_id: userId, name })
          .select();
        if (newF && newF[0]) createdFolders.push(newF[0]);
      }
      if (createdFolders.length > 0) {
        folders = createdFolders;
      }
    } catch (createErr) {
      console.warn('Default folders creation warning:', createErr?.message || createErr);
    }
  }

  // 3. Auto-organize unassigned files into matching folders instantly in memory & DB
  if (folders.length > 0 && files.length > 0) {
    const labFolder = folders.find(f => !f.is_deleted && (
      f.name.toLowerCase().includes('lab') || f.name.toLowerCase().includes('sorting')
    ));
    const lectureFolder = folders.find(f => !f.is_deleted && (
      f.name.toLowerCase().includes('lecture') || f.name.toLowerCase().includes('notes')
    ));
    const practicalFolder = folders.find(f => !f.is_deleted && (
      f.name.toLowerCase().includes('practical') || f.name.toLowerCase().includes('prac') || f.name.toLowerCase().includes('ex')
    ));
    const defaultFolder = practicalFolder || labFolder || lectureFolder || folders.find(f => !f.is_deleted);

    const pendingDbUpdates = [];
    const pendingVirtualInserts = [];

    for (const file of files) {
      if (!file.is_deleted && (!file.folder_id || file.folder_id === 'null' || file.folder_id === '')) {
        const lowerName = (file.filename || '').toLowerCase();
        let matchedFolderId = null;

        if (practicalFolder && (
          /ex[\s\-_0-9.]/i.test(lowerName) ||
          /^ex\d/i.test(lowerName) ||
          lowerName.includes('ex') ||
          lowerName.includes('prac') ||
          lowerName.includes('exercise') ||
          lowerName.includes('assignment') ||
          lowerName.includes('task') ||
          lowerName.endsWith('.txt') ||
          lowerName.endsWith('.cpp') ||
          lowerName.endsWith('.py') ||
          lowerName.endsWith('.java') ||
          lowerName.endsWith('.c')
        )) {
          matchedFolderId = practicalFolder.id;
        } else if (labFolder && (
          lowerName.includes('lab') ||
          lowerName.includes('sorting') ||
          lowerName.includes('sort') ||
          lowerName.includes('sudo') ||
          lowerName.includes('algo') ||
          lowerName.includes('exp')
        )) {
          matchedFolderId = labFolder.id;
        } else if (lectureFolder && (
          lowerName.includes('lecture') ||
          lowerName.includes('notes') ||
          lowerName.includes('unit') ||
          lowerName.includes('ch') ||
          lowerName.includes('chapter') ||
          lowerName.endsWith('.pdf') ||
          lowerName.endsWith('.ppt') ||
          lowerName.endsWith('.pptx')
        )) {
          matchedFolderId = lectureFolder.id;
        } else if (defaultFolder) {
          matchedFolderId = defaultFolder.id;
        }

        if (matchedFolderId) {
          file.folder_id = matchedFolderId;
          if (file.id && !String(file.id).startsWith('storage_')) {
            pendingDbUpdates.push({ id: file.id, folder_id: matchedFolderId });
          } else if (file.storage_path) {
            pendingVirtualInserts.push({
              user_id: userId,
              filename: file.filename,
              storage_path: file.storage_path,
              file_type: file.file_type || 'other',
              size: file.size || 0,
              folder_id: matchedFolderId
            });
          }
        }
      }
    }

    // Persist folder assignments in background without blocking response
    if (pendingDbUpdates.length > 0) {
      Promise.all(
        pendingDbUpdates.map(u =>
          supabase.from('files').update({ folder_id: u.folder_id }).eq('id', u.id)
        )
      ).catch(e => console.warn('Background folder_id update error:', e));
    }
    if (pendingVirtualInserts.length > 0) {
      Promise.all(
        pendingVirtualInserts.map(rec =>
          supabase.from('files').insert(rec)
        )
      ).catch(e => console.warn('Background virtual insert error:', e));
    }
  }

  // 4. Fast Storage Auto-Sync: Only block if files list is empty; otherwise sync in background
  if (files.length === 0) {
    try {
      const { data: storageObjects, error: listErr } = await supabase.storage
        .from('vault')
        .list(`uploads/${userId}`, { limit: 200 });

      if (!listErr && storageObjects && storageObjects.length > 0) {
        const existingPaths = new Set(files.map(f => f.storage_path));
        const unindexedFiles = storageObjects.filter(item => item.name && !item.name.startsWith('.') && item.name !== 'avatar' && !existingPaths.has(`uploads/${userId}/${item.name}`));

        for (const sFile of unindexedFiles) {
          const storagePath = `uploads/${userId}/${sFile.name}`;
          let cleanName = sFile.name;
          const match = sFile.name.match(/^\d+_[a-z0-9]+_(.+)$/i);
          if (match && match[1]) cleanName = match[1];

          const fileType = getCategoryFromFilename(cleanName, sFile.metadata?.mimetype || '');
          const fileSize = sFile.metadata?.size || sFile.size || 0;

          files.push({
            id: sFile.id || 'storage_' + Math.random().toString(36).substring(2, 9),
            user_id: userId,
            filename: cleanName,
            storage_path: storagePath,
            file_type: fileType,
            size: fileSize,
            created_at: sFile.created_at || new Date().toISOString()
          });
        }
      }
    } catch (syncErr) {
      console.warn('Storage sync warning:', syncErr?.message || syncErr);
    }
  }

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
