$ErrorActionPreference = "Stop"

# Load .env file
if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match "^\s*([^#][^=]*)=(.*)$") {
      $name = $matches[1]
      $value = $matches[2]
      Set-Item -Path "env:$name" -Value $value
    }
  }
}

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