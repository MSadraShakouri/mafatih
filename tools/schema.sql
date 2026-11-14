-- SQLite is a generated output, never the source of truth. All text is interned.
PRAGMA foreign_keys = ON;
-- Version 5 adds explicitly recorded editorial join-space proposals.
PRAGMA user_version = 5;
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
-- A row identity persists in history after a physical row is retired.
CREATE TABLE row_identity (
  item_id TEXT NOT NULL REFERENCES item(id), row_id TEXT NOT NULL,
  PRIMARY KEY(item_id,row_id)
) STRICT;
CREATE TABLE item_row (
  item_id TEXT NOT NULL REFERENCES item(id), row_id TEXT NOT NULL, position INTEGER NOT NULL CHECK(position >= 0),
  ar_text_id TEXT REFERENCES text_value(id), fa_text_id TEXT REFERENCES text_value(id), kind TEXT,
  PRIMARY KEY(item_id,row_id), UNIQUE(item_id,position), CHECK(ar_text_id IS NOT NULL OR fa_text_id IS NOT NULL),
  FOREIGN KEY(item_id,row_id) REFERENCES row_identity(item_id,row_id)
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
CREATE TABLE item_split_record (
  item_id TEXT PRIMARY KEY REFERENCES item(id), author TEXT NOT NULL, format_version INTEGER NOT NULL CHECK(format_version IN (1,2,3)),
  baseline_item_sha256 TEXT NOT NULL, plan_sha256 TEXT NOT NULL, layout_sha256 TEXT NOT NULL
) STRICT;
-- Alias identities are previously emitted physical rows; originals belong to the frozen baseline.
CREATE TABLE row_split_original (
  item_id TEXT NOT NULL REFERENCES item_split_record(item_id), source_row_id TEXT NOT NULL, original_json TEXT NOT NULL,
  origin_kind TEXT NOT NULL CHECK(origin_kind IN ('original','alias')),
  PRIMARY KEY(item_id,source_row_id), FOREIGN KEY(item_id,source_row_id) REFERENCES row_identity(item_id,row_id)
) STRICT;
CREATE TABLE row_split_segment (
  item_id TEXT NOT NULL, source_row_id TEXT NOT NULL, source_language TEXT NOT NULL CHECK(source_language IN ('ar','fa')),
  position INTEGER NOT NULL CHECK(position>=0), target_row_id TEXT NOT NULL, target_language TEXT NOT NULL CHECK(target_language IN ('ar','fa')),
  start_cp INTEGER NOT NULL CHECK(start_cp>=0), end_cp INTEGER NOT NULL CHECK(end_cp>start_cp),
  target_start_cp INTEGER NOT NULL CHECK(target_start_cp>=0),
  PRIMARY KEY(item_id,source_row_id,source_language,position),
  FOREIGN KEY(item_id,source_row_id) REFERENCES row_split_original(item_id,source_row_id),
  FOREIGN KEY(item_id,target_row_id) REFERENCES item_row(item_id,row_id)
) STRICT;
-- Insertions are separate from source slices and require independent review.
CREATE TABLE row_split_insertion (
  item_id TEXT NOT NULL REFERENCES item_split_record(item_id), target_row_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('ar','fa')), target_start_cp INTEGER NOT NULL CHECK(target_start_cp>=0),
  inserted_text TEXT NOT NULL CHECK(inserted_text=' '), left_row_id TEXT NOT NULL, right_row_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK(length(reason) BETWEEN 3 AND 240 AND reason=trim(reason)),
  PRIMARY KEY(item_id,target_row_id,language,target_start_cp),
  FOREIGN KEY(item_id,target_row_id) REFERENCES item_row(item_id,row_id),
  FOREIGN KEY(item_id,left_row_id) REFERENCES row_identity(item_id,row_id),
  FOREIGN KEY(item_id,right_row_id) REFERENCES row_identity(item_id,row_id)
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
  FOREIGN KEY(item_id,row_id) REFERENCES row_identity(item_id,row_id)
) STRICT;
CREATE TABLE line_break_marker_move (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL, language TEXT NOT NULL CHECK(language IN ('ar','fa')),
  source_row_id TEXT NOT NULL, destination_row_id TEXT NOT NULL, marker TEXT NOT NULL,
  source_previous_text_id TEXT NOT NULL REFERENCES text_value(id), source_replacement_text_id TEXT NOT NULL REFERENCES text_value(id),
  destination_previous_text_id TEXT NOT NULL REFERENCES text_value(id), destination_replacement_text_id TEXT NOT NULL REFERENCES text_value(id),
  evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  FOREIGN KEY(item_id,source_row_id) REFERENCES row_identity(item_id,row_id),
  FOREIGN KEY(item_id,destination_row_id) REFERENCES row_identity(item_id,row_id)
) STRICT;
CREATE TABLE row_insertion (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL, row_id TEXT NOT NULL, before_row_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  FOREIGN KEY(item_id,row_id) REFERENCES row_identity(item_id,row_id),
  FOREIGN KEY(item_id,before_row_id) REFERENCES row_identity(item_id,row_id)
) STRICT;
CREATE TABLE row_classification (
  position INTEGER PRIMARY KEY, item_id TEXT NOT NULL, row_id TEXT NOT NULL, previous_kind TEXT,
  replacement_kind TEXT NOT NULL, evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), reason TEXT NOT NULL,
  FOREIGN KEY(item_id,row_id) REFERENCES row_identity(item_id,row_id)
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
-- Page-history paths are historical TOC positions, not stable node IDs.
-- Presence bits distinguish an absent optional field from an explicit NULL.
CREATE TABLE navigation_page_batch (
  position INTEGER PRIMARY KEY, method TEXT NOT NULL CHECK(method IN ('heading-trailing-footers-v1','legacy-unmapped-v1')),
  edit_date TEXT, evidence_id TEXT NOT NULL REFERENCES editorial_evidence(id), source_sha256 TEXT,
  CHECK(method != 'heading-trailing-footers-v1' OR (edit_date IS NOT NULL AND source_sha256 IS NOT NULL))
) STRICT;
CREATE TABLE navigation_page_correction (
  batch_position INTEGER NOT NULL REFERENCES navigation_page_batch(position), position INTEGER NOT NULL CHECK(position >= 0),
  path_json TEXT NOT NULL, title_text_id TEXT NOT NULL REFERENCES text_value(id), item_id TEXT REFERENCES item(id), source_level INTEGER,
  previous_start INTEGER, previous_end INTEGER, previous_end_present INTEGER NOT NULL CHECK(previous_end_present IN (0,1)),
  previous_series TEXT CHECK(previous_series IS NULL OR previous_series IN ('front-matter','main')),
  previous_series_present INTEGER NOT NULL CHECK(previous_series_present IN (0,1)),
  replacement_start INTEGER, replacement_end INTEGER, replacement_end_present INTEGER NOT NULL CHECK(replacement_end_present IN (0,1)),
  replacement_series TEXT CHECK(replacement_series IS NULL OR replacement_series IN ('front-matter','main')),
  observation_kind TEXT NOT NULL CHECK(observation_kind IN ('source-heading','mixed-series-root','unnumbered-metadata',
    'unpaginated-after-book','not-in-edition','legacy-unmapped')),
  source_heading INTEGER, previous_footer INTEGER, next_footer INTEGER, last_text_footer INTEGER, subtree_footer INTEGER, descendant_max_end INTEGER,
  PRIMARY KEY(batch_position,position),
  CHECK(previous_end_present = 1 OR previous_end IS NULL), CHECK(previous_series_present = 1 OR previous_series IS NULL),
  CHECK(replacement_end_present = 1 OR replacement_end IS NULL),
  CHECK(replacement_start IS NULL OR (replacement_start > 0 AND replacement_series IS NOT NULL)),
  CHECK(replacement_end IS NULL OR (replacement_end > 0 AND replacement_start IS NOT NULL AND replacement_end >= replacement_start)),
  CHECK(source_heading IS NULL OR source_heading > 0), CHECK(previous_footer IS NULL OR previous_footer > 0),
  CHECK(next_footer IS NULL OR next_footer > 0), CHECK(last_text_footer IS NULL OR last_text_footer > 0),
  CHECK(subtree_footer IS NULL OR subtree_footer > 0), CHECK(descendant_max_end IS NULL OR descendant_max_end > 0)
) STRICT;
CREATE TABLE default_order (position INTEGER PRIMARY KEY, item_id TEXT NOT NULL UNIQUE REFERENCES item(id)) STRICT;
CREATE TABLE featured (position INTEGER PRIMARY KEY, item_id TEXT NOT NULL UNIQUE REFERENCES item(id)) STRICT;
CREATE TABLE navigation_node (
  id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES navigation_node(id), position INTEGER NOT NULL,
  title_text_id TEXT NOT NULL REFERENCES text_value(id), item_id TEXT REFERENCES item(id),
  source_level INTEGER, source_page INTEGER, source_page_end INTEGER,
  source_page_series TEXT CHECK(source_page_series IS NULL OR source_page_series IN ('front-matter','main')),
  source_page_end_present INTEGER NOT NULL CHECK(source_page_end_present IN (0,1)),
  CHECK(source_page IS NULL OR (source_page > 0 AND source_page_series IS NOT NULL)),
  CHECK(source_page_end IS NULL OR (source_page_end > 0 AND source_page IS NOT NULL AND source_page_end >= source_page)),
  CHECK(source_page_end_present = 1 OR source_page_end IS NULL)
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
