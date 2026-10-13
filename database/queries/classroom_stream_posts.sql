-- name: CreateClassroomAnnouncement :one
INSERT INTO classroom_stream_posts (
    classroom_id,
    author_id,
    post_type,
    title,
    content
)
VALUES (
    $1,
    $2,
    'announcement',
    $3,
    $4
)
RETURNING *;


-- name: GetClassroomStreamPostByID :one
SELECT *
FROM classroom_stream_posts
WHERE id = $1
  AND deleted_at IS NULL
LIMIT 1;


-- name: ListClassroomStreamPosts :many
SELECT
    classroom_stream_posts.id,
    classroom_stream_posts.classroom_id,
    classroom_stream_posts.author_id,
    classroom_stream_posts.post_type,
    classroom_stream_posts.title,
    classroom_stream_posts.content,
    classroom_stream_posts.reference_type,
    classroom_stream_posts.reference_id,
    classroom_stream_posts.is_pinned,
    classroom_stream_posts.created_at,
    classroom_stream_posts.updated_at,
    classroom_stream_posts.deleted_at,

    users.email,
    users.username,
    users.first_name,
    users.last_name,
    users.avatar_url

FROM classroom_stream_posts

LEFT JOIN users
    ON users.id =
       classroom_stream_posts.author_id

WHERE classroom_stream_posts.classroom_id = $1
  AND classroom_stream_posts.deleted_at IS NULL

ORDER BY
    classroom_stream_posts.is_pinned DESC,
    classroom_stream_posts.created_at DESC

LIMIT $2
OFFSET $3;


-- name: UpdateClassroomAnnouncement :one
UPDATE classroom_stream_posts
SET
    title = $3,
    content = $4,
    updated_at = NOW()
WHERE id = $1
  AND classroom_id = $2
  AND post_type = 'announcement'
  AND deleted_at IS NULL
RETURNING *;


-- name: PinClassroomStreamPost :one
UPDATE classroom_stream_posts
SET
    is_pinned = TRUE,
    updated_at = NOW()
WHERE id = $1
  AND classroom_id = $2
  AND deleted_at IS NULL
RETURNING *;


-- name: UnpinClassroomStreamPost :one
UPDATE classroom_stream_posts
SET
    is_pinned = FALSE,
    updated_at = NOW()
WHERE id = $1
  AND classroom_id = $2
  AND deleted_at IS NULL
RETURNING *;


-- name: DeleteClassroomStreamPost :execrows
UPDATE classroom_stream_posts
SET
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id = $1
  AND classroom_id = $2
  AND deleted_at IS NULL;