$ErrorActionPreference = "Stop"
cd "c:\Users\thees\Compound\Desktop\Library Near\Library Near Website"

$folders = @("[city]", "about", "actions", "admin", "auth", "blog", "contact", "for-owners", "privacy", "profile", "sales", "saved", "staff-access")
foreach ($folder in $folders) {
  if (Test-Path "src\app\(main)\$folder") {
    Move-Item -LiteralPath "src\app\(main)\$folder" -Destination "src\app\"
  }
}

$files = @("layout.tsx", "page.tsx", "loading.tsx", "not-found.tsx")
foreach ($file in $files) {
  if (Test-Path "src\app\(main)\$file") {
    Move-Item "src\app\(main)\$file" -Destination "src\app\"
  }
}

if (Test-Path "src\app\(studio)\studio") {
  Move-Item "src\app\(studio)\studio" -Destination "src\app\"
}

Remove-Item "src\app\(main)" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "src\app\(studio)" -Recurse -Force -ErrorAction SilentlyContinue
