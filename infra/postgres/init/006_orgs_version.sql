-- Add optimistic-concurrency version to orgs
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0;
