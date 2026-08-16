/**
 * File Service
 * Encapsulates all Supabase database and storage operations for files and folders.
 */

/**
 * Fetch both folders and files for a user.
 */
export const fetchFilesAndFolders = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  // Fetch Folders
  const { data: folders, error: folderErr } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (folderErr) throw folderErr;

  // Fetch Files
  const { data: files, error: fileErr } = await supabase
    .from('files')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fileErr) throw fileErr;

  return { folders: folders || [], files: files || [] };
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
 * Delete a file record from the database.
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
