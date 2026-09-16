# Bundled database snapshot
#
# `database.sql` is a `pg_dump` of the CaseDesk database (schema + rows).
# Postgres loads it automatically on first start when DATA_ROOT/postgres is empty.
#
# Refresh the dump after you change data you want new clones to receive:
#
#   ./scripts/export-database-seed.sh
#   # or on Windows:  .\scripts\export-database-seed.ps1
#
# Then commit `seed/database.sql` and push.
#
# Do not commit the live Postgres folder (`DATA_ROOT/postgres`) or `.env`.
# Keep this GitHub repository private: the dump includes accounts and case records.
