# First Topup Reward Security Test
# Tests that the first topup reward cannot be exploited

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AdminUser = "chenli",
    [string]$AdminPass = "sammy0129",
    [int]$AdminId = 1
)

$ErrorActionPreference = "Stop"
$script:failures = @()
$script:passCount = 0

function Assert-Test($scenario, $test, $condition) {
    if ($condition) {
        Write-Host "  PASS: $test" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "  FAIL: $test" -ForegroundColor Red
        $script:failures += "$scenario | $test"
    }
}

function Api-Post($path, $body, $session, $needAuth) {
    $params = @{
        Method = "POST"
        Uri = "$BaseUrl$path"
        ContentType = "application/json; charset=utf-8"
        UseBasicParsing = $true
    }
    if ($body) {
        $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 10))
    }
    if ($session) { $params.WebSession = $session }
    if ($needAuth) { $params.Headers = @{ "New-Api-User" = "$AdminId" } }
    try {
        return Invoke-RestMethod @params
    } catch {
        if ($_.ErrorDetails.Message) {
            try { return ($_.ErrorDetails.Message | ConvertFrom-Json) } catch {}
        }
        return @{ success = $false; message = $_.Exception.Message }
    }
}

function Sql($query) {
    $r = docker exec postgres psql -U root -d "new-api" -t -A -c $query 2>$null
    if ($r) { return $r.Trim() } else { return "" }
}

function Sql-Insert($query) {
    docker exec postgres psql -U root -d "new-api" -c $query 2>$null | Out-Null
}

# ============ Setup ============

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host " First Topup Reward Security Test" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Cleanup previous test data
Sql-Insert "DELETE FROM promotion_registrations WHERE code LIKE 'tp_%'"
Sql-Insert "DELETE FROM top_ups WHERE trade_no LIKE 'tp_%'"
Sql-Insert "DELETE FROM users WHERE username LIKE 'tp_%'"
Sql-Insert "DELETE FROM promotion_links WHERE code LIKE 'tp_%'"
Write-Host "Cleanup: done" -ForegroundColor Yellow

# Login admin
$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginResp = Api-Post "/api/user/login" @{ username = $AdminUser; password = $AdminPass } $adminSession $false
if (-not $loginResp.success) { throw "Admin login failed: $($loginResp.message)" }
Write-Host "Admin login: OK" -ForegroundColor Yellow

# Create promotion link (reward=5M, first_topup_reward=10M, min_amount=1)
$promoCode = "tp_promo_$(Get-Random -Max 99999)"
$promoResp = Api-Post "/api/promotion/" @{
    code = $promoCode; name = "Test"; channel_tag = "test"
    reward_quota = 5000000; first_topup_reward_quota = 10000000
    first_topup_min_amount = 1; max_registrations = 0; expires_at = 0; enabled = $true
} $adminSession $true
if (-not $promoResp.success) { throw "Create promotion failed: $($promoResp.message)" }
Write-Host "Promotion ($promoCode): created" -ForegroundColor Yellow

# ============ Scenario 1: Registration reward only once ============
Write-Host "`n--- Scenario 1: Registration reward only once ---" -ForegroundColor Magenta

$userA = "tp_a_$(Get-Random -Max 99999)"
$regResp = Api-Post "/api/user/register" @{ username = $userA; password = "Test@12345"; promotion_code = $promoCode } $null $false
Assert-Test "S1" "User A register success" ($regResp.success -eq $true)

$userAId = Sql "SELECT id FROM users WHERE username = '$userA'"
$userAQuota = [long](Sql "SELECT quota FROM users WHERE id = $userAId")
Assert-Test "S1" "Registration reward quota=5000000 (actual=$userAQuota)" ($userAQuota -eq 5000000)

$userAPromo = Sql "SELECT promotion_code FROM users WHERE id = $userAId"
Assert-Test "S1" "promotion_code=$promoCode" ($userAPromo -eq $promoCode)

# Duplicate registration
$regResp2 = Api-Post "/api/user/register" @{ username = $userA; password = "Test@12345"; promotion_code = $promoCode } $null $false
Assert-Test "S1" "Duplicate registration rejected" ($regResp2.success -ne $true)

# ============ Scenario 2: First topup reward only once ============
Write-Host "`n--- Scenario 2: First topup reward only once ---" -ForegroundColor Magenta

$tradeNo1 = "tp_t1_$(Get-Random -Max 99999)"
$now = [long]([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())
Sql-Insert "INSERT INTO top_ups (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status) VALUES ($userAId, 1, 1, '$tradeNo1', 'test', 'epay', $now, 0, 'pending')"

$completeResp = Api-Post "/api/user/topup/complete" @{ trade_no = $tradeNo1 } $adminSession $true
Assert-Test "S2" "First topup complete success" ($completeResp.success -eq $true)

$q = [long](Sql "SELECT quota FROM users WHERE id = $userAId")
# Expected: 5000000 (reg) + 500000 (1*QuotaPerUnit) + 10000000 (first topup) = 15500000
Assert-Test "S2" "After first topup quota=15500000 (actual=$q)" ($q -eq 15500000)

$ftr = Sql "SELECT first_topup_rewarded FROM users WHERE id = $userAId"
Assert-Test "S2" "first_topup_rewarded=true (actual=$ftr)" ($ftr -eq 't')

# Second topup - no reward
$tradeNo2 = "tp_t2_$(Get-Random -Max 99999)"
Sql-Insert "INSERT INTO top_ups (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status) VALUES ($userAId, 5, 5, '$tradeNo2', 'test', 'epay', $now, 0, 'pending')"

$completeResp2 = Api-Post "/api/user/topup/complete" @{ trade_no = $tradeNo2 } $adminSession $true
Assert-Test "S2" "Second topup complete success" ($completeResp2.success -eq $true)

$q2 = [long](Sql "SELECT quota FROM users WHERE id = $userAId")
# Expected: 15500000 + 2500000 (5*500000) = 18000000
Assert-Test "S2" "No double reward quota=18000000 (actual=$q2)" ($q2 -eq 18000000)

$ftCount = [int](Sql "SELECT first_topup_count FROM promotion_links WHERE code = '$promoCode'")
Assert-Test "S2" "first_topup_count=1 (actual=$ftCount)" ($ftCount -eq 1)

# ============ Scenario 3: Concurrent attack ============
Write-Host "`n--- Scenario 3: Concurrent attack - 10 parallel requests ---" -ForegroundColor Magenta

$userB = "tp_b_$(Get-Random -Max 99999)"
$regB = Api-Post "/api/user/register" @{ username = $userB; password = "Test@12345"; promotion_code = $promoCode } $null $false
Assert-Test "S3" "User B register success" ($regB.success -eq $true)
$userBId = Sql "SELECT id FROM users WHERE username = '$userB'"

$tradeNo3 = "tp_t3_$(Get-Random -Max 99999)"
Sql-Insert "INSERT INTO top_ups (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status) VALUES ($userBId, 2, 2, '$tradeNo3', 'test', 'epay', $now, 0, 'pending')"

# Concurrent requests using runspace pool (same process, shares session)
$pool = [RunspaceFactory]::CreateRunspacePool(1, 10)
$pool.Open()
$runspaces = @()
1..10 | ForEach-Object {
    $ps = [PowerShell]::Create().AddScript({
        param($url, $tn, $session, $aid)
        $params = @{
            Method = "POST"
            Uri = "$url/api/user/topup/complete"
            ContentType = "application/json; charset=utf-8"
            Body = [System.Text.Encoding]::UTF8.GetBytes("{`"trade_no`":`"$tn`"}")
            WebSession = $session
            Headers = @{ "New-Api-User" = "$aid" }
            UseBasicParsing = $true
        }
        try { Invoke-RestMethod @params; return "ok" } catch { return "err: $_" }
    }).AddArgument($BaseUrl).AddArgument($tradeNo3).AddArgument($adminSession).AddArgument($AdminId)
    $ps.RunspacePool = $pool
    $runspaces += @{ Pipe = $ps; Handle = $ps.BeginInvoke() }
}
$runspaces | ForEach-Object { $_.Pipe.EndInvoke($_.Handle) | Out-Null; $_.Pipe.Dispose() }
$pool.Close()

Start-Sleep -Seconds 1

$qB = [long](Sql "SELECT quota FROM users WHERE id = $userBId")
# Expected: 5000000 (reg) + 1000000 (2*500000) + 10000000 (first topup) = 16000000
Assert-Test "S3" "Concurrent: quota=16000000 (actual=$qB)" ($qB -eq 16000000)

$ftrB = Sql "SELECT first_topup_rewarded FROM users WHERE id = $userBId"
Assert-Test "S3" "first_topup_rewarded=true" ($ftrB -eq 't')

# ============ Scenario 4: Min amount enforcement ============
Write-Host "`n--- Scenario 4: Min amount enforcement ---" -ForegroundColor Magenta

$promoCode2 = "tp_min_$(Get-Random -Max 99999)"
$promoResp2 = Api-Post "/api/promotion/" @{
    code = $promoCode2; name = "MinTest"; channel_tag = "test"
    reward_quota = 5000000; first_topup_reward_quota = 10000000
    first_topup_min_amount = 100; max_registrations = 0; expires_at = 0; enabled = $true
} $adminSession $true
Assert-Test "S4" "Min-amount promotion created" ($promoResp2.success -eq $true)

$userC = "tp_c_$(Get-Random -Max 99999)"
$regC = Api-Post "/api/user/register" @{ username = $userC; password = "Test@12345"; promotion_code = $promoCode2 } $null $false
Assert-Test "S4" "User C register success" ($regC.success -eq $true)
$userCId = Sql "SELECT id FROM users WHERE username = '$userC'"

# Topup 50 (below min 100)
$tradeNo4 = "tp_t4_$(Get-Random -Max 99999)"
Sql-Insert "INSERT INTO top_ups (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status) VALUES ($userCId, 50, 50, '$tradeNo4', 'test', 'epay', $now, 0, 'pending')"
Api-Post "/api/user/topup/complete" @{ trade_no = $tradeNo4 } $adminSession $true | Out-Null

$qC1 = [long](Sql "SELECT quota FROM users WHERE id = $userCId")
# Expected: 5000000 (reg) + 25000000 (50*500000) = 30000000, NO first topup reward
Assert-Test "S4" "Below min: no reward quota=30000000 (actual=$qC1)" ($qC1 -eq 30000000)

$ftrC1 = Sql "SELECT first_topup_rewarded FROM users WHERE id = $userCId"
Assert-Test "S4" "first_topup_rewarded=false" ($ftrC1 -eq 'f')

# Topup 100 (meets min)
$tradeNo5 = "tp_t5_$(Get-Random -Max 99999)"
Sql-Insert "INSERT INTO top_ups (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status) VALUES ($userCId, 100, 100, '$tradeNo5', 'test', 'epay', $now, 0, 'pending')"
Api-Post "/api/user/topup/complete" @{ trade_no = $tradeNo5 } $adminSession $true | Out-Null

$qC2 = [long](Sql "SELECT quota FROM users WHERE id = $userCId")
# Expected: 30000000 + 50000000 (100*500000) + 10000000 (first topup) = 90000000
Assert-Test "S4" "Meets min: reward granted quota=90000000 (actual=$qC2)" ($qC2 -eq 90000000)

$ftrC2 = Sql "SELECT first_topup_rewarded FROM users WHERE id = $userCId"
Assert-Test "S4" "first_topup_rewarded=true" ($ftrC2 -eq 't')

# ============ Scenario 5: Distributed lock - no double credit ============
Write-Host "`n--- Scenario 5: Distributed lock - no double credit ---" -ForegroundColor Magenta

$userD = "tp_d_$(Get-Random -Max 99999)"
Api-Post "/api/user/register" @{ username = $userD; password = "Test@12345"; promotion_code = $promoCode } $null $false | Out-Null
$userDId = Sql "SELECT id FROM users WHERE username = '$userD'"

$tradeNo6 = "tp_t6_$(Get-Random -Max 99999)"
Sql-Insert "INSERT INTO top_ups (user_id, amount, money, trade_no, payment_method, payment_provider, create_time, complete_time, status) VALUES ($userDId, 3, 3, '$tradeNo6', 'test', 'epay', $now, 0, 'pending')"

$pool2 = [RunspaceFactory]::CreateRunspacePool(1, 10)
$pool2.Open()
$runspaces2 = @()
1..10 | ForEach-Object {
    $ps = [PowerShell]::Create().AddScript({
        param($url, $tn, $session, $aid)
        $params = @{
            Method = "POST"
            Uri = "$url/api/user/topup/complete"
            ContentType = "application/json; charset=utf-8"
            Body = [System.Text.Encoding]::UTF8.GetBytes("{`"trade_no`":`"$tn`"}")
            WebSession = $session
            Headers = @{ "New-Api-User" = "$aid" }
            UseBasicParsing = $true
        }
        try { Invoke-RestMethod @params; return "ok" } catch { return "err: $_" }
    }).AddArgument($BaseUrl).AddArgument($tradeNo6).AddArgument($adminSession).AddArgument($AdminId)
    $ps.RunspacePool = $pool2
    $runspaces2 += @{ Pipe = $ps; Handle = $ps.BeginInvoke() }
}
$runspaces2 | ForEach-Object { $_.Pipe.EndInvoke($_.Handle) | Out-Null; $_.Pipe.Dispose() }
$pool2.Close()

Start-Sleep -Seconds 1

$qD = [long](Sql "SELECT quota FROM users WHERE id = $userDId")
# Expected: 5000000 (reg) + 1500000 (3*500000) + 10000000 (first topup) = 16500000
Assert-Test "S5" "No double credit: quota=16500000 (actual=$qD)" ($qD -eq 16500000)

# Verify Redis lock released
try { $lockVal = docker exec redis redis-cli -a 123456 GET "order_lock:$tradeNo6" 2>$null } catch { $lockVal = "" }
Assert-Test "S5" "Redis lock released" ([string]::IsNullOrWhiteSpace($lockVal))

# ============ Summary ============
Write-Host "`n======================================" -ForegroundColor Cyan
$total = $script:passCount + $script:failures.Count
if ($script:failures.Count -eq 0) {
    Write-Host " ALL $total TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host " $($script:passCount)/$total passed, $($script:failures.Count) FAILED:" -ForegroundColor Red
    $script:failures | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}
Write-Host "======================================`n" -ForegroundColor Cyan
