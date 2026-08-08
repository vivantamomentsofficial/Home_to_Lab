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
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_sign_in_at TIMESTAMP WITH TIME ZONE
);

-- Login logs table (to track user logins for the Admin)
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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
CREATE POLICY "Allow public delete on shared files" ON public.files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.share_codes
            WHERE share_codes.file_id = files.id
        )
    );

DROP POLICY IF EXISTS "Allow public read on shared files" ON public.files;
CREATE POLICY "Allow public read on shared files" ON public.files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.share_codes
            WHERE share_codes.file_id = files.id AND expires_at > now()
        )
    );

-- ADMIN ACCESS: Allow Admin full bypass on files
DROP POLICY IF EXISTS "Admin can do everything on files" ON public.files;
CREATE POLICY "Admin can do everything on files" ON public.files
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'homtolab@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'homtolab@gmail.com');


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
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'homtolab@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'homtolab@gmail.com');


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

DROP POLICY IF EXISTS "Allow public read of active share codes" ON public.share_codes;
CREATE POLICY "Allow public read of active share codes" ON public.share_codes
    FOR SELECT USING (expires_at > now());

-- ADMIN ACCESS: Allow Admin full bypass on share codes
DROP POLICY IF EXISTS "Admin can do everything on share codes" ON public.share_codes;
CREATE POLICY "Admin can do everything on share codes" ON public.share_codes
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'homtolab@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'homtolab@gmail.com');


-- ---------------------------------------------------------
-- RLS Policies for public.profiles
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;
CREATE POLICY "Allow users to view their own profile" ON public.profiles
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow admin to do everything on profiles" ON public.profiles;
CREATE POLICY "Allow admin to do everything on profiles" ON public.profiles
    FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'homtolab@gmail.com')
    WITH CHECK (auth.jwt() ->> 'email' = 'homtolab@gmail.com');


-- ---------------------------------------------------------
-- RLS Policies for public.login_logs
-- ---------------------------------------------------------
DROP POLICY IF EXISTS "Allow users to insert their own login logs" ON public.login_logs;
CREATE POLICY "Allow users to insert their own login logs" ON public.login_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow admin to view all login logs" ON public.login_logs;
CREATE POLICY "Allow admin to view all login logs" ON public.login_logs
    FOR SELECT TO authenticated USING (auth.jwt() ->> 'email' = 'homtolab@gmail.com');


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
        (storage.foldername(name))[2] = auth.uid()::text
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
        auth.jwt() ->> 'email' = 'homtolab@gmail.com'
    )
    WITH CHECK (
        bucket_id = 'vault' AND
        auth.jwt() ->> 'email' = 'homtolab@gmail.com'
    );


-- =========================================================================
-- 4. PROFILE AUTOMATION & TRIGGERS
-- =========================================================================

-- Trigger function to synchronize profiles with auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, last_sign_in_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Guest User'),
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.created_at,
            NEW.last_sign_in_at
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.profiles
        SET 
            email = NEW.email,
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Guest User'),
            avatar_url = NEW.raw_user_meta_data->>'avatar_url',
            last_sign_in_at = NEW.last_sign_in_at
        WHERE id = NEW.id;
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
-- 5. SEED SUPER ADMIN
-- =========================================================================

-- Delete existing super admin if exists to prevent duplicates (bypassing ON CONFLICT constraint error)
DELETE FROM auth.users WHERE email = 'homtolab@gmail.com';

-- Insert Super Admin into auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '77777777-7777-7777-7777-777777777777', -- Static admin UUID
    'authenticated',
    'authenticated',
    'homtolab@gmail.com',
    crypt('26072008', gen_salt('bf')),
    now(),
    NULL,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Super Admin"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
);

-- Run initial sync of all existing users into the profiles table
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, last_sign_in_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Guest User'), 
    raw_user_meta_data->>'avatar_url', 
    created_at, 
    last_sign_in_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    last_sign_in_at = EXCLUDED.last_sign_in_at;
