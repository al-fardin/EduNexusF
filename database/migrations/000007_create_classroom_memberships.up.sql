CREATE TABLE classroom_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    classroom_id UUID NOT NULL
        REFERENCES classrooms(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    member_role VARCHAR(20) NOT NULL DEFAULT 'student',

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    removed_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT classroom_memberships_role_check
        CHECK (
            member_role IN (
                'student',
                'teacher'
            )
        ),

    CONSTRAINT classroom_memberships_status_check
        CHECK (
            status IN (
                'active',
                'removed'
            )
        ),

    CONSTRAINT classroom_memberships_unique
        UNIQUE (
            classroom_id,
            user_id
        )
);

CREATE INDEX idx_classroom_memberships_classroom
ON classroom_memberships(
    classroom_id,
    status
);

CREATE INDEX idx_classroom_memberships_user
ON classroom_memberships(
    user_id,
    status
);

CREATE INDEX idx_classroom_memberships_role
ON classroom_memberships(
    classroom_id,
    member_role
);