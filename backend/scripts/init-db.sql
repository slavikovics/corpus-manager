CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    year INTEGER,
    language VARCHAR(10) DEFAULT 'en',
    source_file VARCHAR(1000),
    file_type VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS word_statistics (
    id SERIAL PRIMARY KEY,
    lemma VARCHAR(255) NOT NULL,
    pos VARCHAR(50),
    total_frequency INTEGER DEFAULT 0,
    document_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lemma, pos)
);

CREATE TABLE IF NOT EXISTS document_word_stats (
    doc_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    lemma VARCHAR(255) NOT NULL,
    pos VARCHAR(50),
    frequency INTEGER DEFAULT 0,
    tfidf FLOAT,
    PRIMARY KEY (doc_id, lemma, pos)
);

CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_author ON documents(author);
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(year);
CREATE INDEX IF NOT EXISTS idx_word_statistics_lemma ON word_statistics(lemma);
CREATE INDEX IF NOT EXISTS idx_document_word_stats_doc ON document_word_stats(doc_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();