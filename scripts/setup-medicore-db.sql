-- Run in pgAdmin 4 Query Tool as a superuser (e.g. postgres).
-- Adjust the password so it matches apps/api/.env DATABASE_URL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medicore_user') THEN
    CREATE ROLE medicore_user LOGIN PASSWORD 'medicore_dev_password';
  ELSE
    ALTER ROLE medicore_user WITH LOGIN PASSWORD 'medicore_dev_password';
  END IF;
END
$$;

-- Create DB if missing (run once; ignore "already exists" if re-run)
-- CREATE DATABASE medicore_dev OWNER medicore_user;

GRANT ALL PRIVILEGES ON DATABASE medicore_dev TO medicore_user;
