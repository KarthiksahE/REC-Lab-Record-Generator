-- SQL Schema for Full Stack Lab Record Generator Database

-- Table to store user credentials synchronizing with Firebase Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Stores Firebase UID
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to store user-submitted document info and experiment details
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_code TEXT,
    course_name TEXT,
    student_name TEXT,
    register_number TEXT,
    department TEXT,
    year TEXT,
    semester TEXT,
    academic_year TEXT,
    faculty TEXT,
    lab_name TEXT,
    institution TEXT,
    experiments JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of JSON objects: s_no, date, title, github_url
    docx_url TEXT, -- Saved Supabase storage path/URL
    pdf_url TEXT,  -- Saved Supabase storage path/URL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table to log document downloads for analytics/download history
CREATE TABLE IF NOT EXISTS download_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('docx', 'pdf')),
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index creation to speed up queries
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_download_history_user_id ON download_history(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);

-- Keep updated_at accurate when an existing record is edited.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_set_updated_at ON documents;
CREATE TRIGGER documents_set_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
