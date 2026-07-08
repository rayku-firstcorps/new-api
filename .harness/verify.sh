#!/bin/bash
# 验证脚本 — 在标记功能完成前运行
# 用法：bash .harness/verify.sh [feature-id]
# 不带参数时运行所有验证

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

check() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} $desc"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $desc"
    FAIL=$((FAIL + 1))
  fi
}

skip() {
  echo -e "  ${YELLOW}−${NC} $1 (跳过)"
  SKIP=$((SKIP + 1))
}

TARGET="${1:-all}"

echo ""
echo "=== new-api Harness 验证 (target: $TARGET) ==="

# ── 通用验证（始终运行）──────────────────────────────
echo ""
echo "── 全局规则验证 ──"

check "Go 编译通过" "go build ./..."

check "未在业务代码中直接调用 encoding/json 编解码（Rule 1）" \
  "! grep -RInE '[[:alnum:]_]*json\.(Marshal|Unmarshal|NewDecoder|NewEncoder)' \
     --include='*.go' \
     controller/ service/ model/ relay/ oauth/ setting/ middleware/ 2>/dev/null \
   | grep -v '_test.go' \
   | grep -vE '^[^:]+:[0-9]+:[[:space:]]*//' \
   | grep -qv '^$'"

# ── 后端模型验证 ─────────────────────────────────────
if [[ "$TARGET" == "all" || "$TARGET" == "promotion-backend-model" ]]; then
  echo ""
  echo "── promotion-backend-model ──"
  check "model/promotion.go 存在" "test -f model/promotion.go"
  check "PromotionLink 结构体存在" \
    "grep -q 'type PromotionLink struct' model/promotion.go"
  check "PromotionRegistration 结构体存在" \
    "grep -q 'type PromotionRegistration struct' model/promotion.go"
  check "AutoMigrate 包含 PromotionLink" \
    "grep -q 'PromotionLink' model/main.go"
  check "AutoMigrate 包含 PromotionRegistration" \
    "grep -q 'PromotionRegistration' model/main.go"
fi

# ── 后端 API 验证 ────────────────────────────────────
if [[ "$TARGET" == "all" || "$TARGET" == "promotion-backend-api" ]]; then
  echo ""
  echo "── promotion-backend-api ──"
  check "controller/promotion.go 存在" "test -f controller/promotion.go"
  check "路由中包含 /api/promotion 注册" \
    "grep -q 'promotion' router/api-router.go"
  check "AdminAuth 用于推广接口" \
    "grep -A5 'promotion' router/api-router.go | grep -q 'AdminAuth\|adminGroup'"
fi

# ── 注册流程验证 ─────────────────────────────────────
if [[ "$TARGET" == "all" || "$TARGET" == "promotion-registration-flow" ]]; then
  echo ""
  echo "── promotion-registration-flow ──"
  check "controller/user.go 读取 promotion_code 参数" \
    "grep -q 'promotion_code\|promo' controller/user.go"
  check "用户模型含 PromotionCode 字段" \
    "grep -q 'PromotionCode\|promotion_code' model/user.go"
fi

# ── 前端参数采集验证 ─────────────────────────────────
if [[ "$TARGET" == "all" || "$TARGET" == "promotion-frontend-capture" ]]; then
  echo ""
  echo "── promotion-frontend-capture ──"
  if command -v bun &>/dev/null; then
    check "前端 typecheck 通过" \
      "cd web/default && bun run typecheck 2>&1 | grep -c 'error TS' | grep -q '^0$'"
    check "注册 API 携带 promotion_code" \
      "grep -q 'promotion_code' web/default/src/features/auth/api.ts 2>/dev/null || \
       grep -rq 'promotion_code' web/default/src/features/auth/ 2>/dev/null"
  else
    skip "前端验证（Bun 未安装）"
  fi
fi

# ── 前端管理页面验证 ─────────────────────────────────
if [[ "$TARGET" == "all" || "$TARGET" == "promotion-frontend-admin" ]]; then
  echo ""
  echo "── promotion-frontend-admin ──"
  check "promotions feature 目录存在" \
    "test -d web/default/src/features/promotions"
  check "promotions api.ts 存在" \
    "test -f web/default/src/features/promotions/api.ts"
  check "promotions types.ts 存在" \
    "test -f web/default/src/features/promotions/types.ts"
  if command -v bun &>/dev/null; then
    check "前端构建通过" \
      "cd web/default && bun run build 2>&1 | grep -v 'warning' | grep -qv 'error'"
  else
    skip "前端构建验证（Bun 未安装）"
  fi
fi

# ── 汇总 ─────────────────────────────────────────────
echo ""
echo "================================================"
echo -e "  通过: ${GREEN}${PASS}${NC}   失败: ${RED}${FAIL}${NC}   跳过: ${YELLOW}${SKIP}${NC}"
echo "================================================"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo -e "${RED}请修复上述失败项后再将功能标记为 done。${NC}"
  exit 1
else
  echo ""
  echo -e "${GREEN}验证通过！可以更新 .harness/feature_list.json 并提交。${NC}"
fi
