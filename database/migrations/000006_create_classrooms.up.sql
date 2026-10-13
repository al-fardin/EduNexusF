CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE RESTRICT,

    name VARCHAR(150) NOT NULL,

    section VARCHAR(100),

    subject VARCHAR(150),

    room VARCHAR(100),

    description TEXT,

    class_code VARCHAR(8) NOT NULL UNIQUE,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    archived_at TIMESTAMPTZ,

    deleted_at TIMESTAMPTZ,

    CONSTRAINT classrooms_name_check
        CHECK (
            CHAR_LENGTH(TRIM(name)) > 0
        ),

    CONSTRAINT classrooms_code_check
        CHECK (
            CHAR_LENGTH(class_code)
            BETWEEN 6 AND 8
        ),

    CONSTRAINT classrooms_status_check
        CHECK (
            status IN (
                'active',
                'archived'
            )
        )
);

CREATE INDEX idx_classrooms_owner_id
ON classrooms(owner_id);

CREATE INDEX idx_classrooms_status
ON classrooms(status);

CREATE INDEX idx_classrooms_created_at
ON classrooms(created_at DESC);

CREATE INDEX idx_classrooms_active_owner
ON classrooms(owner_id, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX idx_classrooms_class_code
ON classrooms(class_code)
WHERE deleted_at IS NULL;