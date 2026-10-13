-- name: CreateClassroomMembership :one
INSERT INTO classroom_memberships (
    classroom_id,
    user_id,
    member_role
)
VALUES (
    $1,
    $2,
    $3
)
RETURNING *;


-- name: GetClassroomMembership :one
SELECT *
FROM classroom_memberships
WHERE classroom_id = $1
  AND user_id = $2
LIMIT 1;


-- name: GetActiveClassroomMembership :one
SELECT *
FROM classroom_memberships
WHERE classroom_id = $1
  AND user_id = $2
  AND status = 'active'
LIMIT 1;


-- name: ListJoinedClassrooms :many
SELECT
    classrooms.*
FROM classroom_memberships
JOIN classrooms
    ON classrooms.id =
       classroom_memberships.classroom_id
WHERE classroom_memberships.user_id = $1
  AND classroom_memberships.status = 'active'
  AND classroom_memberships.member_role = 'student'
  AND classrooms.status = 'active'
  AND classrooms.deleted_at IS NULL
ORDER BY
    classroom_memberships.joined_at DESC
LIMIT $2
OFFSET $3;


-- name: ListClassroomMembers :many
SELECT
    classroom_memberships.id,
    classroom_memberships.classroom_id,
    classroom_memberships.user_id,
    classroom_memberships.member_role,
    classroom_memberships.status,
    classroom_memberships.joined_at,
    classroom_memberships.removed_at,
    classroom_memberships.updated_at,
    users.email,
    users.username,
    users.first_name,
    users.last_name,
    users.avatar_url
FROM classroom_memberships
JOIN users
    ON users.id =
       classroom_memberships.user_id
WHERE classroom_memberships.classroom_id = $1
  AND classroom_memberships.status = 'active'
  AND users.deleted_at IS NULL
ORDER BY
    classroom_memberships.member_role DESC,
    users.first_name ASC,
    users.last_name ASC
LIMIT $2
OFFSET $3;


-- name: RestoreClassroomMembership :one
UPDATE classroom_memberships
SET
    status = 'active',
    removed_at = NULL,
    member_role = $3,
    joined_at = NOW(),
    updated_at = NOW()
WHERE classroom_id = $1
  AND user_id = $2
RETURNING *;


-- name: RemoveClassroomMembership :execrows
UPDATE classroom_memberships
SET
    status = 'removed',
    removed_at = NOW(),
    updated_at = NOW()
WHERE classroom_id = $1
  AND user_id = $2
  AND status = 'active';


-- name: DeleteClassroomMembership :execrows
DELETE FROM classroom_memberships
WHERE classroom_id = $1
  AND user_id = $2;