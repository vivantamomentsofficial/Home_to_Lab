-- Quick Send Setup (No-Login Anonymous Transient Sharing)
-- Run this SQL in your Supabase SQL Editor.

-- 1. Create Private Storage Bucket 'quick' (25MB file limit, no public RLS access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quick',
  'quick',
  false,
  26214400, -- 25 MB in bytes
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400;

-- 2. Create quick_shares table
CREATE TABLE IF NOT EXISTS public.quick_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(6) UNIQUE NOT NULL,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('file', 'text')),
    filename TEXT,
    size BIGINT DEFAULT 0,
    mime TEXT,
    storage_path TEXT,
    text_content TEXT,
    self_destruct BOOLEAN DEFAULT false NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'active', 'consumed')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ip_hash TEXT
);

-- 3. Enable RLS with NO policies (deny all for client SDKs; service role bypasses RLS)
ALTER TABLE public.quick_shares ENABLE ROW LEVEL SECURITY;

-- 4. Create Indexes for fast lookup and cleanup operations
CREATE INDEX IF NOT EXISTS idx_quick_shares_code ON public.quick_shares(code);
CREATE INDEX IF NOT EXISTS idx_quick_shares_expires_at ON public.quick_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_quick_shares_status ON public.quick_shares(status);
CREATE INDEX IF NOT EXISTS idx_quick_shares_created_at ON public.quick_shares(created_at);
