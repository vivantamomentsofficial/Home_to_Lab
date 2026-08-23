-- CloudVault Database Schema & Security Setup
-- Execute this SQL script in your Supabase SQL Editor.

-- Enable pgcrypto extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 1. TABLES SETUP
-- =========================================================================

-- Files table (storing metadata of uploaded files)
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notes table (for Quick Text snippets and text clipboard)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Share Codes table (for the 30-minute share codes)
CREATE TABLE IF NOT EXISTS public.share_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    signed_url TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles table (to expose user details to the Admin dashboard safely)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE, -- Nullable to support anonymous guest sign-ins
    full_name TEXT,
    college TEXT,      -- College Name added for tracking
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    is_admin BOOLEAN DEFAULT false NOT NULL,
    storage_limit BIGINT DEFAULT 104857600 NOT NULL
);

-- Ensure columns exist if the table was created in an older version of the schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- Trash / Soft-delete columns for files and notes
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false NOT NULL;

-- Login logs table (to track user logins for the Admin)
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT, -- Nullable to support guest logs
    login_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_address TEXT
);

-- Ensure migration updates
ALTER TABLE public.login_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Admin Audit Logs table (tracking all high-privilege administrative actions)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------
-- RLS Policies for public.admin_audit_logs
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Admin can manage audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admin can manage audit logs" ON public.admin_audit_logs
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------
-- RLS Policies for public.files
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own files" ON public.files;
CREATE POLICY "Users can insert their own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own files" ON public.files;
CREATE POLICY "Users can view their own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own files" ON public.files;
CREATE POLICY "Users can update their own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own files" ON public.files;
CREATE POLICY "Users can delete their own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

-- FIXED: Qualified columns to files.id to resolve the scoping bug (which was previously file_id = id, shadowing share_codes.id)
DROP POLICY IF EXISTS "Allow public delete on shared files" ON public.files;


-- Drop broad public read policy on files (Replaced by get_shared_file_by_code RPC)
DROP POLICY IF EXISTS "Allow public read on shared files" ON public.files;

-- =========================================================================
-- 5.5. HELPER FUNCTION TO CHECK ADMIN STATUS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'email') = 'homtolab@gmail.com',
        false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ADMIN ACCESS: Allow Admin full bypass on files
DROP POLICY IF EXISTS "Admin can do everything on files" ON public.files;
CREATE POLICY "Admin can do everything on files" ON public.files
    FOR ALL TO authenticated USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------------------------------------------------------
-- RLS Policies for public.notes
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);

-- ADMIN ACCESS: Allow Admin full bypass on notes
DROP POLICY IF EXISTS "Admin can do everything on notes" ON public.notes;
CREATE POLICY "Admin can do everything on notes" ON public.notes
    FOR ALL TO authenticated USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------------------------------------------------------
-- RLS Policies for public.share_codes
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own share codes" ON public.share_codes;
CREATE POLICY "Users can insert their own share codes" ON public.share_codes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.files f 
            WHERE f.id = file_id AND f.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own share codes" ON public.share_codes;
CREATE POLICY "Users can update their own share codes" ON public.share_codes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.files f 
            WHERE f.id = file_id AND f.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own share codes" ON public.share_codes;
CREATE POLICY "Users can delete their own share codes" ON public.share_codes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.files f 
            WHERE f.id = file_id AND f.user_id = auth.uid()
        )
    );

-- Drop broad public read policy on share codes (Replaced by get_shared_file_by_code RPC)
DROP POLICY IF EXISTS "Allow public read of active share codes" ON public.share_codes;

-- ADMIN ACCESS: Allow Admin full bypass on share codes
DROP POLICY IF EXISTS "Admin can do everything on share codes" ON public.share_codes;
CREATE POLICY "Admin can do everything on share codes" ON public.share_codes
    FOR ALL TO authenticated USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------------------------------------------------------
-- RLS Policies for public.profiles
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
CREATE POLICY "Allow users to view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admin to do everything on profiles" ON public.profiles;
CREATE POLICY "Allow admin to do everything on profiles" ON public.profiles
    FOR ALL TO authenticated USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ---------------------------------------------------------
-- RLS Policies for public.login_logs
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to insert their own login logs" ON public.login_logs;
CREATE POLICY "Allow users to insert their own login logs" ON public.login_logs
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Allow admin to view all login logs" ON public.login_logs;
CREATE POLICY "Allow admin to view all login logs" ON public.login_logs
    FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow users to view their own login logs" ON public.login_logs;
CREATE POLICY "Allow users to view their own login logs" ON public.login_logs
    FOR SELECT TO authenticated USING (auth.uid() = user_id);


-- =========================================================================
-- 3. STORAGE SETUP & STORAGE POLICIES
-- =========================================================================

-- Create the private 'vault' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload files to their folder (uploads/{user_id}/...)
DROP POLICY IF EXISTS "Allow users to upload files to their folder" ON storage.objects;
CREATE POLICY "Allow users to upload files to their folder" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text AND
        -- Enforce storage limit checks dynamically
        (
            SELECT COALESCE(SUM(size), 0)
            FROM public.files
            WHERE user_id = auth.uid()
        ) + COALESCE((metadata->>'size')::bigint, 0) <= (
            SELECT COALESCE(storage_limit, 104857600)
            FROM public.profiles
            WHERE id = auth.uid()
        )
    );

-- Allow users to view/select their own uploaded files
DROP POLICY IF EXISTS "Allow users to view their own storage files" ON storage.objects;
CREATE POLICY "Allow users to view their own storage files" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to update files in their own folder
DROP POLICY IF EXISTS "Allow users to update their own storage files" ON storage.objects;
CREATE POLICY "Allow users to update their own storage files" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to delete files from their own folder
DROP POLICY IF EXISTS "Allow users to delete their own storage files" ON storage.objects;
CREATE POLICY "Allow users to delete their own storage files" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- ADMIN ACCESS: Allow Admin full bypass on all storage files in the vault bucket
DROP POLICY IF EXISTS "Admin can manage all storage files" ON storage.objects;
CREATE POLICY "Admin can manage all storage files" ON storage.objects
    FOR ALL TO authenticated USING (
        bucket_id = 'vault' AND
        public.is_admin()
    )
    WITH CHECK (
        bucket_id = 'vault' AND
        public.is_admin()
    );


-- =========================================================================
-- 4. PROFILE AUTOMATION & TRIGGERS
-- =========================================================================

-- Trigger function to synchronize profiles with auth.users and log login sessions
CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.profiles (id, email, full_name, college, avatar_url, created_at, last_sign_in_at, is_admin)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Guest User'),
            NEW.raw_user_meta_data->>'college',
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.created_at,
            NEW.last_sign_in_at,
            COALESCE((NEW.email = 'homtolab@gmail.com'), false)
        );
        -- Log login upon sign-up creation
        INSERT INTO public.login_logs (user_id, email, login_time)
        VALUES (NEW.id, COALESCE(NEW.email, 'guest@cloudvault.local'), COALESCE(NEW.last_sign_in_at, now()));
        
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.profiles
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Guest User'),
            college = NEW.raw_user_meta_data->>'college',
            avatar_url = NEW.raw_user_meta_data->>'avatar_url',
            last_sign_in_at = NEW.last_sign_in_at
        WHERE id = NEW.id;

        -- Automatically log new login sessions on auth updates (when last_sign_in_at shifts)
        IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL THEN
            INSERT INTO public.login_logs (user_id, email, login_time)
            VALUES (NEW.id, COALESCE(NEW.email, 'guest@cloudvault.local'), NEW.last_sign_in_at);
        END IF;

        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.profiles WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers on auth.users to keep profiles up-to-date
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_change();

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email, raw_user_meta_data, last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_change();


-- =========================================================================
-- 5. SUPER ADMIN PROVISIONING
-- =========================================================================
-- Note: Create the super admin user (homtolab@gmail.com) via your Supabase
-- Auth Dashboard (Authentication -> Users -> Add User) with a strong password.
-- The triggers will automatically create the corresponding profile and grant admin rights.


-- Run initial sync of all existing users into the profiles table
INSERT INTO public.profiles (id, email, full_name, college, avatar_url, created_at, last_sign_in_at, is_admin)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Guest User'), 
    raw_user_meta_data->>'college',
    raw_user_meta_data->>'avatar_url', 
    created_at, 
    last_sign_in_at,
    COALESCE((email = 'homtolab@gmail.com'), false)
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    college = EXCLUDED.college,
    avatar_url = EXCLUDED.avatar_url,
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    is_admin = EXCLUDED.is_admin;



-- =========================================================================
-- 6. SECURE RPC UTILITIES FOR ACCOUNT DELETION & UPDATES
-- =========================================================================

-- Function to allow users to delete their own account from auth.users (cascades to profiles, files, notes)
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS VOID AS $$
BEGIN
    -- Delete the current authenticated user
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allow Super Admin to delete any user from auth.users (cascades to profiles, files, notes)
CREATE OR REPLACE FUNCTION public.admin_delete_user(
    target_user_id UUID
) RETURNS VOID AS $$
BEGIN
    -- Verify if caller is the admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only super admin can delete user accounts.';
    END IF;

    -- Delete target user
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to allow Super Admin to update user profile full name inside auth.users metadata
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
    target_user_id UUID,
    new_full_name TEXT
) RETURNS VOID AS $$
BEGIN
    -- Verify if caller is the admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only super admin can update user profiles.';
    END IF;

    -- Update auth.users metadata
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', new_full_name)
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- 7. FOLDERS AND STORAGE LIMIT UPGRADES SCHEMA
-- =========================================================================

-- Create Folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add folder_id to files referencing folders
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- Add storage_limit to profiles (default 100MB in bytes)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS storage_limit BIGINT DEFAULT 104857600 NOT NULL;

-- Create Storage Upgrade Requests table
CREATE TABLE IF NOT EXISTS public.storage_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    requested_limit BIGINT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folders
DROP POLICY IF EXISTS "Users can manage their own folders" ON public.folders;
CREATE POLICY "Users can manage their own folders" ON public.folders
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can manage all folders" ON public.folders;
CREATE POLICY "Admin can manage all folders" ON public.folders
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- RLS Policies for storage_requests
DROP POLICY IF EXISTS "Users can view and insert their own requests" ON public.storage_requests;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.storage_requests;
CREATE POLICY "Users can view their own requests" ON public.storage_requests
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own requests" ON public.storage_requests;
CREATE POLICY "Users can insert their own requests" ON public.storage_requests
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id AND
        status = 'pending'
    );

DROP POLICY IF EXISTS "Admin can view and update all requests" ON public.storage_requests;
CREATE POLICY "Admin can view and update all requests" ON public.storage_requests
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Trigger function to check user storage limit before inserting a file record
CREATE OR REPLACE FUNCTION public.check_user_storage_limit()
RETURNS TRIGGER AS $$
DECLARE
    total_used BIGINT;
    user_limit BIGINT;
BEGIN
    -- Calculate total size used by the user currently
    SELECT COALESCE(SUM(size), 0) INTO total_used
    FROM public.files
    WHERE user_id = NEW.user_id;

    -- Get the user's limit from profiles
    SELECT COALESCE(storage_limit, 104857600) INTO user_limit
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Check if limit is exceeded by the new upload
    IF (total_used + NEW.size) > user_limit THEN
        RAISE EXCEPTION 'Storage quota exceeded. Limit is % MB, but you are trying to use % MB.', 
            user_limit / (1024 * 1024), 
            (total_used + NEW.size) / (1024 * 1024);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.files
DROP TRIGGER IF EXISTS check_storage_before_file_insert ON public.files;
CREATE TRIGGER check_storage_before_file_insert
    BEFORE INSERT ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_storage_limit();

-- Trigger to automatically apply storage upgrade to profile on admin approval
CREATE OR REPLACE FUNCTION public.handle_storage_request_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        UPDATE public.profiles
        SET storage_limit = NEW.requested_limit
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_storage_request_approved ON public.storage_requests;
CREATE TRIGGER on_storage_request_approved
    AFTER UPDATE OF status ON public.storage_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_storage_request_approval();


-- =========================================================================
-- 8. FEATURE LOCKING AND ACCOUNT SUSPENSION ENFORCEMENTS
-- =========================================================================

-- Add locking columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upload_locked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clipboard_locked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS download_locked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operations_locked BOOLEAN DEFAULT false NOT NULL;

-- Function to allow Super Admin to clear all login logs
CREATE OR REPLACE FUNCTION public.admin_clear_login_logs()
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only super admin can clear login logs.';
    END IF;
    DELETE FROM public.login_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to check user upload lock
CREATE OR REPLACE FUNCTION public.check_user_upload_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT upload_locked FROM public.profiles WHERE id = NEW.user_id) = true THEN
        RAISE EXCEPTION 'File uploads have been locked for this account by the administrator.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_upload_lock_before_insert ON public.files;
CREATE TRIGGER check_upload_lock_before_insert
    BEFORE INSERT ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_upload_lock();

-- Trigger function to check user clipboard lock
CREATE OR REPLACE FUNCTION public.check_user_clipboard_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT clipboard_locked FROM public.profiles WHERE id = NEW.user_id) = true THEN
        RAISE EXCEPTION 'Note snippet creations have been locked for this account by the administrator.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_clipboard_lock_before_insert ON public.notes;
CREATE TRIGGER check_clipboard_lock_before_insert
    BEFORE INSERT ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_clipboard_lock();

-- Trigger function to check user operations lock (for rename, delete, folder creations)
CREATE OR REPLACE FUNCTION public.check_user_operations_lock()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := NEW.user_id;
    END IF;

    IF (SELECT operations_locked FROM public.profiles WHERE id = target_user_id) = true THEN
        RAISE EXCEPTION 'File, folder, and snippet modifications have been locked for this account by the administrator.';
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on public.files (lock updates and deletes)
DROP TRIGGER IF EXISTS check_operations_lock_before_update_delete ON public.files;
CREATE TRIGGER check_operations_lock_before_update_delete
    BEFORE UPDATE OR DELETE ON public.files
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_operations_lock();

-- Trigger on public.folders (lock folder insert, update, deletes)
DROP TRIGGER IF EXISTS check_operations_lock_before_folder_mod ON public.folders;
CREATE TRIGGER check_operations_lock_before_folder_mod
    BEFORE INSERT OR UPDATE OR DELETE ON public.folders
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_operations_lock();

-- Trigger on public.notes (lock note updates and deletes)
DROP TRIGGER IF EXISTS check_operations_lock_before_note_mod ON public.notes;
CREATE TRIGGER check_operations_lock_before_note_mod
    BEFORE UPDATE OR DELETE ON public.notes
    FOR EACH ROW
    EXECUTE FUNCTION public.check_user_operations_lock();


-- =========================================================================
-- 6. AUTOMATED STORAGE CLEANUP (pg_cron)
-- =========================================================================

-- Function to delete expired share codes and files older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Delete share codes that have already expired
    DELETE FROM public.share_codes
    WHERE expires_at < now();

    -- Delete files (and their linked share codes via cascade) older than 7 days
    DELETE FROM public.files
    WHERE created_at < now() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 9. GLOBAL ANNOUNCEMENTS / ALERTS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.global_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.global_alerts ENABLE ROW LEVEL SECURITY;

-- Select policy: anyone can view
DROP POLICY IF EXISTS "Anyone can view global alerts" ON public.global_alerts;
CREATE POLICY "Anyone can view global alerts" ON public.global_alerts
    FOR SELECT USING (true);

-- Admin policy: manage anything
DROP POLICY IF EXISTS "Admin can manage global alerts" ON public.global_alerts;
CREATE POLICY "Admin can manage global alerts" ON public.global_alerts
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================================
-- 10. SECURE SHARE CODE RETRIEVAL & BURN-AFTER-READING LOGIC
-- =========================================================================

-- Add self_destruct column to share_codes table
ALTER TABLE public.share_codes ADD COLUMN IF NOT EXISTS self_destruct BOOLEAN DEFAULT false NOT NULL;

-- Parameterized SECURITY DEFINER function to retrieve a specific shared file by exact code safely
CREATE OR REPLACE FUNCTION public.get_shared_file_by_code(p_code VARCHAR)
RETURNS TABLE (
    file_id UUID,
    filename TEXT,
    size BIGINT,
    file_type TEXT,
    signed_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    self_destruct BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_share RECORD;
    v_file RECORD;
BEGIN
    -- 1. Look up active unexpired share code matching parameter exactly (case-insensitive)
    SELECT * INTO v_share 
    FROM public.share_codes 
    WHERE UPPER(code) = UPPER(p_code) AND share_codes.expires_at > now();

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Look up associated file metadata
    SELECT * INTO v_file
    FROM public.files
    WHERE id = v_share.file_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 3. If marked self-destruct (Burn-after-reading), delete file (cascades to delete share code)
    IF v_share.self_destruct THEN
        DELETE FROM public.files WHERE id = v_file.id;
    END IF;

    -- 4. Return file information and signed URL
    RETURN QUERY
    SELECT 
        v_file.id,
        v_file.filename,
        v_file.size,
        v_file.file_type,
        v_share.signed_url,
        v_share.expires_at,
        v_share.self_destruct;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_file_by_code(VARCHAR) TO anon, authenticated, service_role;

-- Legacy RPC support for backwards compatibility
CREATE OR REPLACE FUNCTION public.resolve_self_destruct_share(target_code VARCHAR)
RETURNS VOID AS $$
DECLARE
    target_file_id UUID;
BEGIN
    SELECT file_id INTO target_file_id
    FROM public.share_codes
    WHERE UPPER(code) = UPPER(target_code);
    
    IF target_file_id IS NOT NULL THEN
        DELETE FROM public.files WHERE id = target_file_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.resolve_self_destruct_share(VARCHAR) TO anon, authenticated, service_role;





