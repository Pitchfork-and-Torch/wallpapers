# Deploy wallpaper.jonbailey.xyz to Cloudflare Pages.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Public = Join-Path $Root "public"
$Project = "wallpapers-jonbailey"

foreach ($rel in @(
  "catalog.json",
  "og.jpg",
  "og.png",
  "styles.css",
  "app.js",
  "llms.txt",
  "sitemap.xml",
  "VERSION"
)) {
  if (-not (Test-Path (Join-Path $Public $rel))) {
    Write-Error "Missing public/$rel"
  }
}

$catalog = Get-Content -Raw -Path (Join-Path $Public "catalog.json") | ConvertFrom-Json
if (-not $catalog.wallpapers -or $catalog.wallpapers.Count -lt 1) {
  Write-Error "catalog.json has no wallpapers"
}
foreach ($item in $catalog.wallpapers) {
  $original = Join-Path $Public ($item.file.TrimStart("/").Replace("/", "\"))
  if (-not (Test-Path $original)) { Write-Error "Missing $($item.file)" }
  $previewPath = (($item.preview.src -split '\?')[0]).TrimStart("/").Replace("/", "\")
  $preview = Join-Path $Public $previewPath
  if (-not (Test-Path $preview)) { Write-Error "Missing $($item.preview.src)" }
  if ($item.phone -and $item.phone.file) {
    $phone = Join-Path $Public ($item.phone.file.TrimStart("/").Replace("/", "\"))
    if (-not (Test-Path $phone)) { Write-Error "Missing $($item.phone.file)" }
  }
}

py -3 (Join-Path $Root "scripts\build_packs.py")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$manifestPath = Join-Path $Public "packs.json"
if (-not (Test-Path $manifestPath)) { Write-Error "Missing packs.json" }
$manifest = Get-Content -Raw -Path $manifestPath | ConvertFrom-Json
if (-not $manifest.packs -or $manifest.packs.Count -lt 1) { Write-Error "packs.json has no packs" }
foreach ($pack in $manifest.packs) {
  $zip = Join-Path $Public ($pack.file.TrimStart("/").Replace("/", "\"))
  if (-not (Test-Path $zip)) { Write-Error "Missing $($pack.file)" }
  if ((Get-Item $zip).Length -gt 25MB) { Write-Error "$($pack.file) is over 25 MB" }
}

Write-Host "[DEPLOY] Wallpapers project=$Project" -ForegroundColor Cyan
Push-Location $Root
try {
  npx --yes wrangler pages deploy $Public --project-name=$Project --branch main --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Site:    https://wallpaper.jonbailey.xyz/"
Write-Host "Preview: https://$Project.pages.dev/"
Write-Host "Source:  $Root"
Write-Host ""
Write-Host "If the custom domain is not attached yet:"
Write-Host "  Attach wallpaper.jonbailey.xyz on the Pages project if it is not already."
