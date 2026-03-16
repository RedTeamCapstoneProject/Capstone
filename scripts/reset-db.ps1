$ErrorActionPreference = "Stop"

$dbHost = "localhost"
$dbPort = 5432
$dbUser = "postgres"
$dbName = "Capstone"

Write-Host "Dropping and recreating $dbName..."

psql -h $dbHost -p $dbPort -U $dbUser -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ""$dbName"";"
psql -h $dbHost -p $dbPort -U $dbUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ""$dbName"";"

.\scripts\migrate.ps1