-- SQLite is a generated output, never the source of truth. All text is interned.
PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;
CREATE TABLE corpus_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
CREATE TABLE text_value (id TEXT PRIMARY KEY, value TEXT NOT NULL UNIQUE) STRICT;
CREATE TABLE claim (id TEXT PRIMARY KEY, text_id TEXT NOT NULL REFERENCES text_value(id)) STRICT;
CREATE TABLE source (
  id TEXT PRIMARY KEY, name_text_id TEXT NOT NULL REFERENCES text_value(id),
  author_text_id TEXT REFERENCES text_value(id), edition_text_id TEXT REFERENCES text_value(id), url TEXT,
  license_status TEXT NOT NULL CHECK(license_status IN ('unverified','permitted','restricted','disallowed')),
  license_name_text_id TEXT REFERENCES text_value(id), license_url TEXT,
  license_evidence_text_id TEXT REFERENCES text_value(id), allowed_uses_json TEXT,
  attribution_text_id TEXT REFERENCES text_value(id), notes_text_id TEXT REFERENCES text_value(id)
) STRICT;
CREATE TABLE item (
  id TEXT PRIMARY KEY, legacy_id TEXT UNIQUE,
  title_fa TEXT REFERENCES text_value(id), title_ar TEXT REFERENCES text_value(id), title_en TEXT REFERENCES text_value(id),
  category TEXT NOT NULL, quran_chapter INTEGER CHECK(quran_chapter BETWEEN 1 AND 114), legacy_alignment TEXT,
  legacy_missing_english_reason_claim TEXT REFERENCES claim(id),
  legacy_missing_english_title TEXT REFERENCES text_value(id), review_json TEXT
) STRICT;
CREATE TABLE item_row (
  item_id TEXT NOT NULL REFERENCES item(id), row_id TEXT NOT NULL, position INTEGER NOT NULL CHECK(position >= 0),
  ar_text_id TEXT REFERENCES text_value(id), fa_text_id TEXT REFERENCES text_value(id), kind TEXT,
  PRIMARY KEY(item_id,row_id), UNIQUE(item_id,position), CHECK(ar_text_id IS NOT NULL OR fa_text_id IS NOT NULL)
) STRICT;
CREATE TABLE item_tag (
  item_id TEXT NOT NULL REFERENCES item(id), position INTEGER NOT NULL CHECK(position >= 0),
  text_id TEXT NOT NULL REFERENCES text_value(id), PRIMARY KEY(item_id,position)
) STRICT;
CREATE TABLE item_source (
  item_id TEXT NOT NULL REFERENCES item(id), language TEXT NOT NULL CHECK(language IN ('ar','fa')),
  position INTEGER NOT NULL, source_id TEXT NOT NULL REFERENCES source(id), PRIMARY KEY(item_id,language,position)
) STRICT;
CREATE TABLE row_source (
  item_id TEXT NOT NULL, row_id TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('ar','fa')),
  position INTEGER NOT NULL, source_id TEXT NOT NULL REFERENCES source(id),
  PRIMARY KEY(item_id,row_id,language,position), FOREIGN KEY(item_id,row_id) REFERENCES item_row(item_id,row_id)
) STRICT;
CREATE TABLE english_document (
  id TEXT PRIMARY KEY, title_text_id TEXT REFERENCES text_value(id), title_ar_text_id TEXT REFERENCES text_value(id),
  section_text_id TEXT REFERENCES text_value(id), chapter_text_id TEXT REFERENCES text_value(id),
  translator_claim_id TEXT REFERENCES claim(id), origin_claim_id TEXT REFERENCES claim(id),
  method_claim_id TEXT REFERENCES claim(id), note_claim_id TEXT REFERENCES claim(id), coverage TEXT NOT NULL, review_json TEXT
) STRICT;
CREATE TABLE english_paragraph (
  document_id TEXT NOT NULL REFERENCES english_document(id), paragraph_id TEXT NOT NULL, position INTEGER NOT NULL,
  text_id TEXT NOT NULL REFERENCES text_value(id), source_claim_id TEXT REFERENCES claim(id),
  PRIMARY KEY(document_id,paragraph_id), UNIQUE(document_id,position)
) STRICT;
CREATE TABLE document_source (
  document_id TEXT NOT NULL REFERENCES english_document(id), position INTEGER NOT NULL,
  source_id TEXT NOT NULL REFERENCES source(id), PRIMARY KEY(document_id,position)
) STRICT;
CREATE TABLE paragraph_source (
  document_id TEXT NOT NULL, paragraph_id TEXT NOT NULL, position INTEGER NOT NULL, source_id TEXT NOT NULL REFERENCES source(id),
  PRIMARY KEY(document_id,paragraph_id,position), FOREIGN KEY(document_id,paragraph_id) REFERENCES english_paragraph(document_id,paragraph_id)
) STRICT;
CREATE TABLE english_link (
  item_id TEXT NOT NULL REFERENCES item(id), document_id TEXT NOT NULL REFERENCES english_document(id),
  kind TEXT NOT NULL, review_json TEXT, PRIMARY KEY(item_id,document_id)
) STRICT;
CREATE TABLE editorial_evidence (id TEXT PRIMARY KEY, url TEXT NOT NULL, description TEXT NOT NULL) STRICT;
CREATE TABLE english_display_title (
  document_id TEXT PRIMARY KEY REFERENCES english_document(id), en_text_id TEXT REFERENCES text_value(id),
  ar_text_id TEXT REFERENCES text_value(id), evidence_id TEXT REFERENCES editorial_evidence(id)
) STRICT;
CREATE TABLE metadata_correction (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL REFERENCES item(id), field TEXT NOT NULL,
  previous_text_id TEXT REFERENCES text_value(id), replacement_text_id TEXT REFERENCES text_value(id),
  source_document_id TEXT NOT NULL REFERENCES english_document(id),
  evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id)
) STRICT;
CREATE TABLE row_correction (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL, row_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('ar','fa')), previous_text_id TEXT REFERENCES text_value(id),
  replacement_text_id TEXT REFERENCES text_value(id), evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  FOREIGN KEY(item_id,row_id) REFERENCES item_row(item_id,row_id)
) STRICT;
CREATE TABLE row_insertion (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL, row_id TEXT NOT NULL, before_row_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  FOREIGN KEY(item_id,row_id) REFERENCES item_row(item_id,row_id),
  FOREIGN KEY(item_id,before_row_id) REFERENCES item_row(item_id,row_id)
) STRICT;
CREATE TABLE row_classification (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL, row_id TEXT NOT NULL, previous_kind TEXT,
  replacement_kind TEXT NOT NULL, evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  FOREIGN KEY(item_id,row_id) REFERENCES item_row(item_id,row_id)
) STRICT;
CREATE TABLE paragraph_removal (
  position INTEGER PRIMARY KEY, document_id TEXT NOT NULL REFERENCES english_document(id), paragraph_id TEXT NOT NULL,
  text_id TEXT NOT NULL REFERENCES text_value(id), preserved_document_id TEXT NOT NULL, preserved_paragraph_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  UNIQUE(document_id,paragraph_id),
  FOREIGN KEY(preserved_document_id,preserved_paragraph_id) REFERENCES english_paragraph(document_id,paragraph_id)
) STRICT;
CREATE VIEW paragraph_redirect AS
  SELECT document_id,paragraph_id,preserved_document_id AS target_document_id,
         preserved_paragraph_id AS target_paragraph_id,text_id AS original_text_id
  FROM paragraph_removal;
CREATE TABLE retracted_link (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL REFERENCES item(id), document_id TEXT NOT NULL REFERENCES english_document(id),
  kind TEXT NOT NULL, evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL
) STRICT;
CREATE TABLE created_document (
  position INTEGER PRIMARY KEY, document_id TEXT NOT NULL REFERENCES english_document(id),
  based_on_document_id TEXT NOT NULL REFERENCES english_document(id), based_on_paragraph_id TEXT NOT NULL,
  source_record TEXT NOT NULL, evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL
) STRICT;
CREATE TABLE proposed_link_history (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL REFERENCES item(id), document_id TEXT NOT NULL REFERENCES english_document(id),
  evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL
) STRICT;
-- Mechanical punctuation edits retain the exact old and new pooled text IDs.
-- location_json is the typed occurrence address from editorial-history.json;
-- navigation paths are historical positions rather than permanent IDs.
CREATE TABLE punctuation_normalization (
  position INTEGER PRIMARY KEY, rule TEXT NOT NULL, edit_date TEXT NOT NULL
) STRICT;
CREATE TABLE punctuation_correction (
  batch_position INTEGER NOT NULL REFERENCES punctuation_normalization(position),
  position INTEGER NOT NULL, location_json TEXT NOT NULL,
  previous_text_id TEXT NOT NULL REFERENCES text_value(id),
  replacement_text_id TEXT NOT NULL REFERENCES text_value(id),
  PRIMARY KEY(batch_position,position)
) STRICT;
CREATE TABLE default_order (position INTEGER PRIMARY KEY, item_id TEXT NOT NULL UNIQUE REFERENCES item(id)) STRICT;
CREATE TABLE featured (position INTEGER PRIMARY KEY, item_id TEXT NOT NULL UNIQUE REFERENCES item(id)) STRICT;
CREATE TABLE navigation_node (
  id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES navigation_node(id), position INTEGER NOT NULL,
  title_text_id TEXT NOT NULL REFERENCES text_value(id), item_id TEXT REFERENCES item(id),
  source_level INTEGER, source_page INTEGER, source_page_end INTEGER
) STRICT;
CREATE TABLE alignment_group (
  item_id TEXT NOT NULL REFERENCES item(id), group_id TEXT NOT NULL, method TEXT NOT NULL,
  reviewer TEXT NOT NULL, review_date TEXT NOT NULL, review_note TEXT, evidence_json TEXT NOT NULL,
  PRIMARY KEY(item_id,group_id)
) STRICT;
CREATE TABLE alignment_span (
  item_id TEXT NOT NULL, group_id TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('ar','fa','en')),
  position INTEGER NOT NULL, row_id TEXT, document_id TEXT, paragraph_id TEXT,
  start_cp INTEGER NOT NULL CHECK(start_cp>=0), end_cp INTEGER NOT NULL CHECK(end_cp>start_cp), sha256 TEXT NOT NULL,
  PRIMARY KEY(item_id,group_id,language,position),
  FOREIGN KEY(item_id,group_id) REFERENCES alignment_group(item_id,group_id),
  FOREIGN KEY(item_id,row_id) REFERENCES item_row(item_id,row_id),
  FOREIGN KEY(document_id,paragraph_id) REFERENCES english_paragraph(document_id,paragraph_id),
  CHECK((language IN ('ar','fa') AND row_id IS NOT NULL AND document_id IS NULL AND paragraph_id IS NULL)
     OR (language='en' AND row_id IS NULL AND document_id IS NOT NULL AND paragraph_id IS NOT NULL))
) STRICT;
CREATE INDEX item_row_order_idx ON item_row(item_id,position);
CREATE INDEX english_link_document_idx ON english_link(document_id);
CREATE INDEX english_paragraph_order_idx ON english_paragraph(document_id,position);
CREATE INDEX navigation_parent_idx ON navigation_node(parent_id,position);
