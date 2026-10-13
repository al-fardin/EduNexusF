CREATE TABLE classroom_stream_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    classroom_id UUID NOT NULL
        REFERENCES classrooms(id)
        ON DELETE CASCADE,

    author_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    post_type VARCHAR(30) NOT NULL,

    title VARCHAR(200),

    content TEXT NOT NULL,

    reference_type VARCHAR(30),

    reference_id UUID,

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ,

    CONSTRAINT classroom_stream_posts_type_check
        CHECK (
            post_type IN (
                'announcement',
                'assignment',
                'material',
                'exam',
                'system'
            )
        ),

    CONSTRAINT classroom_stream_posts_content_check
        CHECK (
            CHAR_LENGTH(TRIM(content)) > 0
        ),

    CONSTRAINT classroom_stream_posts_reference_type_check
        CHECK (
            reference_type IS NULL
            OR reference_type IN (
                'assignment',
                'material',
                'exam'
            )
        )
);

CREATE INDEX idx_classroom_stream_posts_classroom
ON classroom_stream_posts (
    classroom_id,
    created_at DESC
)
WHERE deleted_at IS NULL;

CREATE INDEX idx_classroom_stream_posts_author
ON classroom_stream_posts (
    author_id
)
WHERE deleted_at IS NULL;

CREATE INDEX idx_classroom_stream_posts_pinned
ON classroom_stream_posts (
    classroom_id,
    is_pinned,
    created_at DESC
)
WHERE deleted_at IS NULL;

CREATE INDEX idx_classroom_stream_posts_reference
ON classroom_stream_posts (
    reference_type,
    reference_id
)
WHERE deleted_at IS NULL;