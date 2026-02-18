# Developer Mode Toggle Script
# This script enables/disables developer mode for your organization

param(
    [Parameter(Mandatory = $false)]
    [switch]$Enable = $false,
    
    [Parameter(Mandatory = $false)]
    [switch]$Disable = $false,
    
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "http://localhost:5000",
    
    [Parameter(Mandatory = $false)]
    [string]$SecretKey = $env:DEVELOPER_MODE_SECRET
)

# Check if either Enable or Disable is specified
if (-not $Enable -and -not $Disable) {
    Write-Host "Error: Please specify either -Enable or -Disable" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  Enable developer mode:  .\enable-developer-mode.ps1 -Enable" -ForegroundColor Cyan
    Write-Host "  Disable developer mode: .\enable-developer-mode.ps1 -Disable" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Optional parameters:" -ForegroundColor Yellow
    Write-Host "  -BaseUrl <url>     API base URL (default: http://localhost:5000)" -ForegroundColor Gray
    Write-Host "  -SecretKey <key>   Developer mode secret key (default: from DEVELOPER_MODE_SECRET env var)" -ForegroundColor Gray
    exit 1
}

# Check for secret key
if (-not $SecretKey) {
    $SecretKey = "dev-mode-secret-key-change-me"
    Write-Host "Warning: Using default secret key. Set DEVELOPER_MODE_SECRET env var for production." -ForegroundColor Yellow
}

# Determine if we're enabling or disabling
$action = if ($Enable) { "enable" } else { "disable" }
$enabled = $Enable.IsPresent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Developer Mode Toggle" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Action: " -NoNewline
Write-Host $action.ToUpper() -ForegroundColor $(if ($Enable) { "Green" } else { "Yellow" })
Write-Host "API URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# You'll need to login first and copy your session cookie
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Login to your application in a browser" -ForegroundColor Gray
Write-Host "2. Open browser DevTools (F12)" -ForegroundColor Gray
Write-Host "3. Go to Application/Storage > Cookies" -ForegroundColor Gray
Write-Host "4. Copy the value of 'connect.sid' cookie" -ForegroundColor Gray
Write-Host "5. Paste it when prompted below" -ForegroundColor Gray
Write-Host ""

$sessionCookie = Read-Host "Enter your session cookie (connect.sid value)"

if (-not $sessionCookie) {
    Write-Host "Error: Session cookie is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Sending request..." -ForegroundColor Cyan

try {
    $body = @{
        enabled   = $enabled
        secretKey = $SecretKey
    } | ConvertTo-Json

    $headers = @{
        "Content-Type" = "application/json"
        "Cookie"       = "connect.sid=$sessionCookie"
    }

    $response = Invoke-RestMethod `
        -Uri "$BaseUrl/api/subscription/developer-mode" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SUCCESS!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host $response.message -ForegroundColor Green
    Write-Host ""
    Write-Host "Developer Mode: " -NoNewline
    Write-Host $(if ($response.isDeveloper) { "ENABLED" } else { "DISABLED" }) -ForegroundColor $(if ($response.isDeveloper) { "Green" } else { "Yellow" })
    Write-Host ""
    
    if ($response.isDeveloper) {
        Write-Host "Your organization now has:" -ForegroundColor Cyan
        Write-Host "  ✓ Unlimited stores" -ForegroundColor Green
        Write-Host "  ✓ Unlimited users" -ForegroundColor Green
        Write-Host "  ✓ No subscription restrictions" -ForegroundColor Green
        Write-Host "  ✓ Access to all premium features" -ForegroundColor Green
    }
    else {
        Write-Host "Your organization is now in normal mode." -ForegroundColor Yellow
        Write-Host "Subscription restrictions will apply." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Note: Refresh your application to see the changes." -ForegroundColor Gray
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Failed to toggle developer mode" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host ""
            Write-Host "Server response:" -ForegroundColor Yellow
            Write-Host "  $($errorObj.error): $($errorObj.message)" -ForegroundColor Red
        }
        catch {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "  1. Make sure the server is running at $BaseUrl" -ForegroundColor Gray
    Write-Host "  2. Verify your session cookie is valid (not expired)" -ForegroundColor Gray
    Write-Host "  3. Check if DEVELOPER_MODE_SECRET matches in your .env file" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
