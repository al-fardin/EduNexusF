-- Phase 1: protected classroom learning materials and their stream posts.
CREATE TABLE classroom_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(100) NOT NULL UNIQUE,
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 15728640),
    media_type VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (char_length(trim(title)) > 0)
);
CREATE INDEX idx_classroom_materials_classroom ON classroom_materials(classroom_id, created_at DESC);
