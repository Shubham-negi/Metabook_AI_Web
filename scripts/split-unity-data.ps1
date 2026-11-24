# Prepares a fresh Unity WebGL build in dist/Build for GitHub (no Git LFS):
#   - splits the data file into parts below GitHub's 100 MB file limit (player.js joins them again in the browser),
#   - points dist/unity-config.json at the parts and at the build's loader, framework and code files,
#   - warns about any other file still over the limit.
#
# After copying Unity's Build folder into dist/Build, run from the repo folder:
#   powershell -ExecutionPolicy Bypass -File scripts/split-unity-data.ps1
param([int]$PartMB = 45)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$build = Join-Path $root "dist\Build"
$configPath = Join-Path $root "dist\unity-config.json"
$limit = 100MB

function Find-One($pattern) {
    Get-ChildItem $build -File | Where-Object { $_.Name -like $pattern -and $_.Name -notmatch '\.part\d+$' } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
}

$data = Find-One "*.data*"
if (-not $data) { Write-Host "No unsplit data file in dist/Build. Copy the new Unity build in first."; exit 1 }

# Parts left by an older build would be uploaded by mistake, so clear them first.
Get-ChildItem $build -File | Where-Object { $_.Name -match '\.part\d+$' } | Remove-Item

$partSize = $PartMB * 1MB
$buffer = New-Object byte[] $partSize
$parts = @()
$in = [IO.File]::OpenRead($data.FullName)
try {
    $n = 0
    while ($true) {
        $filled = 0
        while ($filled -lt $partSize) {
            $read = $in.Read($buffer, $filled, $partSize - $filled)
            if ($read -le 0) { break }
            $filled += $read
        }
        if ($filled -eq 0) { break }
        $n++
        $name = "$($data.Name).part$n"
        $out = [IO.File]::Create((Join-Path $build $name))
        try { $out.Write($buffer, 0, $filled) } finally { $out.Close() }
        $parts += "./Build/$name"
        if ($filled -lt $partSize) { break }
    }
} finally { $in.Close() }
Remove-Item $data.FullName
Write-Host "Split $($data.Name) ($([math]::Round($data.Length / 1MB, 1)) MB) into $($parts.Count) part(s) of up to $PartMB MB."

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$config.PSObject.Properties.Remove("dataUrl")
$config.PSObject.Properties.Remove("dataParts")
$config | Add-Member -NotePropertyName dataParts -NotePropertyValue $parts
foreach ($pair in @(@("loaderUrl", "*.loader.js"), @("frameworkUrl", "*.framework.js*"), @("codeUrl", "*.wasm*"))) {
    $file = Find-One $pair[1]
    if ($file) {
        $config.PSObject.Properties.Remove($pair[0])
        $config | Add-Member -NotePropertyName $pair[0] -NotePropertyValue "./Build/$($file.Name)"
    }
}
# No byte-order mark: Node's JSON.parse (the Vercel build check) rejects one.
[IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding $false))
Write-Host "Updated dist/unity-config.json."

$big = Get-ChildItem $build -File | Where-Object { $_.Length -ge $limit }
if ($big) { $big | ForEach-Object { Write-Warning "$($_.Name) is still over 100 MB, so GitHub will refuse it." }; exit 1 }
Write-Host "Every file in dist/Build is under GitHub's 100 MB limit. Commit and push."
