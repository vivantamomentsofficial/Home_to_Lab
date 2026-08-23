/**
 * Note Service
 * Encapsulates all Supabase database operations for text snippets/notes.
 */

/**
 * Fetch all note clippings for a user.
 */
export const fetchNotesFromDb = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Insert a new note clipping.
 */
export const insertNoteRecord = async (supabase, noteData) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('notes')
    .insert(noteData)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Update an existing note clipping.
 */
export const updateNoteRecord = async (supabase, noteId, noteData) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('notes')
    .update(noteData)
    .eq('id', noteId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Soft delete a note (move to trash).
 */
export const softDeleteNoteRecord = async (supabase, noteId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('notes')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', noteId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Restore a soft-deleted note from trash.
 */
export const restoreNoteRecord = async (supabase, noteId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('notes')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', noteId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Permanently delete a note clipping.
 */
export const deleteNoteRecord = async (supabase, noteId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
};

