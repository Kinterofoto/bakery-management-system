-- Add program_document column to store markdown content for each program
ALTER TABLE qms.sanitation_programs
ADD COLUMN IF NOT EXISTS program_document text;

COMMENT ON COLUMN qms.sanitation_programs.program_document IS 'Markdown content for the program document, supports Mermaid diagrams';
