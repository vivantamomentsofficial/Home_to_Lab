-- CloudVault Database Schema & Security Setup
-- Execute this SQL script in your Supabase SQL Editor.

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

-- =========================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for files table
CREATE POLICY "Users can insert their own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Allow public delete on shared files" ON public.files
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.share_codes
            WHERE file_id = id
        )
    );


-- RLS Policies for notes table
CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (auth.uid() = user_id);


-- RLS Policies for share_codes table
-- Owner can manage their share codes
CREATE POLICY "Users can manage their own share codes" ON public.share_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.files f 
            WHERE f.id = file_id AND f.user_id = auth.uid()
        )
    );

-- Anyone can select active share codes (for anonymous file sharing download page)
CREATE POLICY "Allow public read of active share codes" ON public.share_codes
    FOR SELECT USING (expires_at > now());

-- =========================================================================
-- 3. STORAGE SETUP & STORAGE POLICIES
-- =========================================================================

-- Create the private 'vault' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault', 'vault', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects table
-- Allow users to insert files to their own upload folder (uploads/{user_id}/...)
CREATE POLICY "Allow users to upload files to their folder" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to view/select their own uploaded files
CREATE POLICY "Allow users to view their own storage files" ON storage.objects
    FOR SELECT TO authenticated USING (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to update files in their own folder
CREATE POLICY "Allow users to update their own storage files" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );

-- Allow users to delete files from their own folder
CREATE POLICY "Allow users to delete their own storage files" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'vault' AND
        (storage.foldername(name))[1] = 'uploads' AND
        (storage.foldername(name))[2] = auth.uid()::text
    );


