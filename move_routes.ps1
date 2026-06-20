$ErrorActionPreference = "Stop"
cd "c:\Users\thees\Compound\Desktop\Library Near\Library Near Website"

mkdir "src\app\(main)"
mkdir "src\app\(studio)"

$folders = @("[city]", "about", "actions", "admin", "auth", "blog", "contact", "for-owners", "privacy", "profile", "sales", "saved", "staff-access")
foreach ($folder in $folders) {
  Move-Item "src\app\$folder" "src\app\(main)\"
}

$files = @("layout.tsx", "page.tsx", "loading.tsx", "not-found.tsx")
foreach ($file in $files) {
  Move-Item "src\app\$file" "src\app\(main)\"
}

Move-Item "src\app\studio" "src\app\(studio)\"
