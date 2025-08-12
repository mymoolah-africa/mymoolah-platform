-- Creates a least-privileged role for the app and grants minimal rights
-- Adjust password as needed before running.

DO $$ BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mymoolah_app') THEN
      CREATE ROLE mymoolah_app LOGIN PASSWORD 'CHANGEME_STRONG_PASSWORD';
   END IF;
END $$;

GRANT CONNECT ON DATABASE mymoolah TO mymoolah_app;

-- Schema grants
GRANT USAGE ON SCHEMA public TO mymoolah_app;

-- Table privileges for runtime
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mymoolah_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mymoolah_app;

-- Sequence privileges for id generation
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO mymoolah_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO mymoolah_app;


