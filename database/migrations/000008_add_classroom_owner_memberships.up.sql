CREATE OR REPLACE FUNCTION ensure_classroom_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO classroom_memberships (
        classroom_id,
        user_id,
        member_role,
        status
    )
    VALUES (
        NEW.id,
        NEW.owner_id,
        'teacher',
        'active'
    )
    ON CONFLICT (
        classroom_id,
        user_id
    )
    DO UPDATE SET
        member_role = 'teacher',
        status = 'active',
        removed_at = NULL,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_classroom_owner_membership
AFTER INSERT ON classrooms
FOR EACH ROW
EXECUTE FUNCTION ensure_classroom_owner_membership();


INSERT INTO classroom_memberships (
    classroom_id,
    user_id,
    member_role,
    status
)
SELECT
    classrooms.id,
    classrooms.owner_id,
    'teacher',
    'active'
FROM classrooms
WHERE classrooms.deleted_at IS NULL
ON CONFLICT (
    classroom_id,
    user_id
)
DO UPDATE SET
    member_role = 'teacher',
    status = 'active',
    removed_at = NULL,
    updated_at = NOW();