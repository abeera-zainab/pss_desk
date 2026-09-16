$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
docker compose exec -T db pg_dump -U casedesk --no-owner --no-acl casedesk -f /tmp/casedesk.sql
docker compose cp db:/tmp/casedesk.sql seed/database.sql
docker compose exec -T db rm -f /tmp/casedesk.sql
Write-Host "Wrote seed/database.sql"
