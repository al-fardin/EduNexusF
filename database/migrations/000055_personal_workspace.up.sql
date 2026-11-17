CREATE TABLE personal_workspace_items (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(char_length(title) BETWEEN 1 AND 160),
 body TEXT NOT NULL DEFAULT '' CHECK(octet_length(body)<=20000),
 checklist JSONB NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(checklist)='array' AND jsonb_array_length(checklist)<=100),
 links JSONB NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(links)='array' AND jsonb_array_length(links)<=20),
 context_class UUID,
 context_kind TEXT NOT NULL DEFAULT '' CHECK(context_kind IN ('','class','material','assignment','exam','post','message')),
 context_id TEXT,
 version INTEGER NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK((context_kind='' AND context_class IS NULL AND context_id IS NULL) OR (context_kind<>'' AND context_class IS NOT NULL AND context_id IS NOT NULL))
);
CREATE INDEX personal_workspace_page ON personal_workspace_items(user_id,updated_at DESC,id);
CREATE TABLE personal_workspace_files (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 item_id UUID NOT NULL REFERENCES personal_workspace_items(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 bytes BYTEA NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 10485760),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX personal_workspace_file_item ON personal_workspace_files(item_id,id);
