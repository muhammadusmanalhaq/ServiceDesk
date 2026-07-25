CREATE USER servicedesk_app WITH PASSWORD 'apppassword';
GRANT CONNECT ON DATABASE servicedesk TO servicedesk_app;
GRANT USAGE ON SCHEMA public TO servicedesk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO servicedesk_app;

-- Also grant usage on sequences so EF Core can generate IDs if needed
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO servicedesk_app;

-- Ensure future tables also get these grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO servicedesk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
   GRANT USAGE, SELECT ON SEQUENCES TO servicedesk_app;
