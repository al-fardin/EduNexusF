ALTER TABLE classroom_topic_resources DROP CONSTRAINT classroom_topic_resources_resource_kind_check;
ALTER TABLE classroom_topic_resources ADD CONSTRAINT classroom_topic_resources_resource_kind_check CHECK(resource_kind IN ('assignment','material','exam'));
CREATE TABLE classroom_announcement_drafts(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
 author_id UUID REFERENCES users(id) ON DELETE SET NULL,title TEXT NOT NULL DEFAULT '' CHECK(char_length(title)<=200),
 content TEXT NOT NULL CHECK(char_length(trim(content)) BETWEEN 1 AND 20000),
 state TEXT NOT NULL CHECK(state IN ('draft','scheduled','published','blocked','cancelled')),
 publish_at TIMESTAMPTZ,post_id UUID REFERENCES classroom_stream_posts(id) ON DELETE SET NULL,
 version INTEGER NOT NULL DEFAULT 1,error TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(state<>'scheduled' OR publish_at IS NOT NULL)
);
CREATE INDEX announcements_due ON classroom_announcement_drafts(publish_at) WHERE state='scheduled';
