/**
 * Profile Service
 * Encapsulates all Supabase database and authentication operations for profiles, passwords, and sessions.
 */

/**
 * Fetch profile details for a user.
 */
export const fetchProfileDetailsFromDb = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, college, storage_limit, upload_locked, clipboard_locked, download_locked, is_suspended, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    // Auto-create missing profile row for user
    const { data: authUserData } = await supabase.auth.getUser();
    const currentUser = authUserData?.user;

    const newProfile = {
      id: userId,
      email: currentUser?.email || null,
      full_name: currentUser?.user_metadata?.full_name || currentUser?.email || 'CloudVault User',
      college: currentUser?.user_metadata?.college || null,
      avatar_url: currentUser?.user_metadata?.avatar_url || null,
      storage_limit: 104857600
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select('full_name, college, storage_limit, upload_locked, clipboard_locked, download_locked, is_suspended, avatar_url')
      .maybeSingle();

    if (insertErr) {
      console.warn('Profile auto-creation fallback failed:', insertErr.message);
      return newProfile;
    }
    return inserted || newProfile;
  }

  return data;
};

/**
 * Update profile metadata (e.g. display name, college, avatar URL).
 */
export const updateProfileMetadataInDb = async (supabase, userId, profileData) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Update user password in Supabase Auth.
 */
export const updateUserPasswordInAuth = async (supabase, newPassword) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;
  return data;
};

/**
 * Check if the user has a pending storage upgrade request.
 */
export const fetchUpgradeRequestStatusFromDb = async (supabase, userId) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('storage_requests')
    .select('id, status')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1);

  if (error) throw error;
  return data && data.length > 0;
};

/**
 * Submit a storage upgrade request.
 */
export const insertUpgradeRequest = async (supabase, userId, email, requestedLimitBytes) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('storage_requests')
    .insert({
      user_id: userId,
      email: email,
      requested_limit: requestedLimitBytes,
      status: 'pending'
    })
    .select();

  if (error) throw error;
  return data?.[0];
};

/**
 * Fetch login logs history for session monitoring.
 */
export const fetchLoginLogsFromDb = async (supabase, userId, limit = 10) => {
  if (!supabase) throw new Error('Supabase client not initialized.');

  const { data, error } = await supabase
    .from('login_logs')
    .select('id, email, login_time, ip_address')
    .eq('user_id', userId)
    .order('login_time', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
