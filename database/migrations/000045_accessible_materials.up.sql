CREATE TABLE classroom_material_accessibility (
 material_id UUID PRIMARY KEY REFERENCES classroom_materials(id) ON DELETE CASCADE,
 image_alt TEXT NOT NULL DEFAULT '' CHECK(char_length(image_alt)<=1000),
 caption TEXT NOT NULL DEFAULT '' CHECK(char_length(caption)<=4000),
 plain_text TEXT NOT NULL DEFAULT '' CHECK(char_length(plain_text)<=200000),
 transcript TEXT NOT NULL DEFAULT '' CHECK(char_length(transcript)<=200000),
 captions_vtt TEXT NOT NULL DEFAULT '' CHECK(char_length(captions_vtt)<=100000),
 version INTEGER NOT NULL DEFAULT 1,
 updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
