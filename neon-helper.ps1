# Neon CLI Helper Script for PowerShell
# Save this as: neon-helper.ps1

# Create alias for neonctl
$neonctlPath = "E:\NodeFiles\neonctl.cmd"

function neonctl {
    & $neonctlPath @args
}

# Quick commands
function Get-NeonBranches {
    & $neonctlPath branches list --project-id quiet-river-82570320
}

function Get-NeonConnectionString {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet("production", "development", "dev", "prod")]
        [string]$Branch
    )
    
    $branchId = switch ($Branch) {
        "production" { "br-nameless-math-a1rfln59" }
        "prod" { "br-nameless-math-a1rfln59" }
        "development" { "br-fancy-cherry-a1dqw7s2" }
        "dev" { "br-fancy-cherry-a1dqw7s2" }
    }
    
    & $neonctlPath connection-string --branch-id $branchId --project-id quiet-river-82570320
}

function New-NeonBranch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        
        [Parameter(Mandatory = $false)]
        [string]$Parent = "development"
    )
    
    $parentId = if ($Parent -eq "development" -or $Parent -eq "dev") {
        "br-fancy-cherry-a1dqw7s2"
    }
    else {
        "br-nameless-math-a1rfln59"
    }
    
    & $neonctlPath branches create --name $Name --parent-id $parentId --project-id quiet-river-82570320
}

# Usage examples:
# . .\neon-helper.ps1              # Load this script
# neonctl --version                # Use neonctl command
# Get-NeonBranches                 # List all branches
# Get-NeonConnectionString dev     # Get dev connection string
# Get-NeonConnectionString prod    # Get prod connection string
# New-NeonBranch feature/billing   # Create new feature branch

Write-Host "✅ Neon CLI helper loaded!" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Cyan
Write-Host "  neonctl                          - Run neonctl commands"
Write-Host "  Get-NeonBranches                 - List all branches"
Write-Host "  Get-NeonConnectionString <name>  - Get connection string"
Write-Host "  New-NeonBranch <name>            - Create new branch"
Write-Host ""
Write-Host "Your branches:" -ForegroundColor Yellow
Get-NeonBranches
