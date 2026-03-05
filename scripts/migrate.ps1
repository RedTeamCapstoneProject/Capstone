$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  throw "DATABASE_URL is not set. Load your .env first or set it in your terminal."
}

Write-Host "Running migrations against DATABASE_URL..."

Get-ChildItem ".\database\migrations\*.sql" |
  Sort-Object Name |
  ForEach-Object {
    Write-Host "Applying $($_.Name)..."
    psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($_.Name)" }
  }

Write-Host "Done."