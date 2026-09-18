# Bundled database snapshot
#
# `database.sql` is a `pg_dump` of the CaseDesk database (schema + rows).
# `migration.sql` applies schema deltas on top of that dump (username, deletedAt,
# loginNo). Both run automatically on first start when DATA_ROOT/postgres is empty
# (`01-seed.sql` then `02-migration.sql`).
#
# Refresh the dump after you change data you want new clones to receive:
#
#   ./scripts/export-database-seed.sh
#   # or on Windows:  .\scripts\export-database-seed.ps1
#
# Then commit `seed/database.sql` (and `seed/migration.sql` if the schema changed) and push.
#
# Do not commit the live Postgres folder (`DATA_ROOT/postgres`) or `.env`.
# Keep this GitHub repository private: the dump includes accounts and case records.
