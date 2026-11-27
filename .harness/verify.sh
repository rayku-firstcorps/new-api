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
      "(cd web/default && bun run typecheck 2>&1 | grep -c 'error TS' | grep -q '^0$')"
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
      "(cd web/default && bun run build 2>&1 | grep -v 'warning' | grep -qv 'error')"
  else
    skip "前端构建验证（Bun 未安装）"
  fi
fi

# ── Stage 3：用户引导（First Setup）─────────────────
onboarding_frontend_checks() {
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "前端测试通过" "(cd web && bun run test)"
  else
    skip "前端验证（Bun 未安装）"
  fi
}

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-new-user-quota-switch" ]]; then
  echo ""
  echo "── onboarding-new-user-quota-switch ──"
  check "quota_setting 含 new_user_quota_enabled" \
    "grep -q 'new_user_quota_enabled' setting/operation_setting/quota_setting.go"
  check "quota_setting 含 new_user_quota_require_email" \
    "grep -q 'new_user_quota_require_email' setting/operation_setting/quota_setting.go"
  check "TryGrantNewUserQuota 保留行锁" \
    "grep -A40 'func TryGrantNewUserQuota' model/user.go | grep -q 'lockForUpdate'"
  check "后端构建通过" "go build ./..."
  check "后端相关测试通过" "go test ./model/... ./controller/... ./setting/..."
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-setting-and-state" ]]; then
  echo ""
  echo "── onboarding-setting-and-state ──"
  check "onboarding_setting.go 存在" "test -f setting/operation_setting/onboarding_setting.go"
  check "/api/status 暴露 onboarding_enabled" "grep -q 'onboarding_enabled' controller/misc.go"
  check "/api/status 暴露 new_user_quota_amount" "grep -q 'new_user_quota_amount' controller/misc.go"
  check "UserSetting 含引导状态字段" "grep -q 'onboarding_completed' relaykit/dto/user_settings.go"
  check "后端构建通过" "go build ./..."
  check "relaykit 独立构建通过" "(cd relaykit && GOWORK=off go build ./...)"
  check "后端相关测试通过" "go test ./model/... ./controller/... ./setting/..."
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-admin-settings-ui" ]]; then
  echo ""
  echo "── onboarding-admin-settings-ui ──"
  check "额度设置含注册赠送开关" \
    "grep -q 'new_user_quota_enabled' web/src/features/system-settings/general/quota-settings-section.tsx"
  check "OnboardingSettingsSection 已注册" \
    "grep -rq 'onboarding' web/src/features/system-settings/operations/section-registry.tsx"
  onboarding_frontend_checks
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-wizard-shell" ]]; then
  echo ""
  echo "── onboarding-wizard-shell ──"
  check "WizardShell 存在" "test -f web/src/components/wizard/wizard-shell.tsx"
  check "/setup 使用 WizardShell" "grep -rq 'WizardShell' web/src/features/setup/"
  check "/setup 完成后跳 /sign-in?from=setup" "grep -rq 'from=setup\\|from: .setup.' web/src/features/setup/"
  onboarding_frontend_checks
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-user-wizard-core" ]]; then
  echo ""
  echo "── onboarding-user-wizard-core ──"
  check "onboarding feature 目录存在" "test -d web/src/features/onboarding"
  check "/onboarding 路由存在" "test -f web/src/routes/_authenticated/onboarding/index.tsx"
  check "onboarding 不把完整 Key 写入 localStorage" \
    "! grep -rn 'localStorage.setItem' web/src/features/onboarding/ | grep -qi 'key\\b.*sk-\\|fullKey\\|tokenKey'"
  onboarding_frontend_checks
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-user-wizard-connect" ]]; then
  echo ""
  echo "── onboarding-user-wizard-connect ──"
  check "onboarding 引用 CC Switch 组件" "grep -rqi 'ccswitch\\|cc-switch\\|CCSwitch' web/src/features/onboarding/"
  onboarding_frontend_checks
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-admin-first-setup" ]]; then
  echo ""
  echo "── onboarding-admin-first-setup ──"
  check "onboarding 含管理员引导" "grep -rqi 'admin' web/src/features/onboarding/"
  onboarding_frontend_checks
fi

if [[ "$TARGET" == "all" || "$TARGET" == "onboarding-overview-refine" ]]; then
  echo ""
  echo "── onboarding-overview-refine ──"
  check "Summary 卡片含 Not topped up yet" \
    "grep -rq 'Not topped up yet' web/src/features/dashboard/components/overview/"
  check "RequestPreview 不再 truncate 代码行" \
    "! grep -q 'truncate' web/src/features/dashboard/components/overview/request-preview.tsx"
  onboarding_frontend_checks
fi

if [[ "$TARGET" == "all" || "$TARGET" == "playground-responses-image" ]]; then
  echo ""
  echo "── playground-responses-image ──"
  check "注册 POST /pg/responses" \
    "grep -q 'playgroundRouter.POST(\"/responses\"' router/relay-router.go"
  check "/pg/responses 映射为 RelayModeResponses" \
    "grep -q '/pg/responses' relay/constant/relay_mode.go"
  check "后端构建通过" "go build ./..."
  check "后端相关测试通过" \
    "go test ./relay/constant/ ./middleware/ -run 'TestPath2RelayMode|TestGetModelRequestReadsPlaygroundGroupForEveryPlaygroundRoute'"
  check "前端按 image-generation 端点切换 Responses" \
    "grep -q 'IMAGE_GENERATION_ENDPOINT_TYPE' web/src/features/playground/hooks/use-playground-options.ts"
  check "保存消息时丢弃图片 base64" \
    "grep -q 'store only their placeholders' web/src/features/playground/lib/storage/storage.ts"
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "Playground 测试通过" "(cd web && bunx vitest run src/features/playground)"
  else
    skip "前端验证（Bun 未安装）"
  fi
fi

if [[ "$TARGET" == "all" || "$TARGET" == "playground-claude-messages" ]]; then
  echo ""
  echo "── playground-claude-messages ──"
  check "注册 POST /pg/messages" \
    "grep -q 'playgroundRouter.POST(\"/messages\"' router/relay-router.go"
  check "/pg/messages 声明会话访问规则" \
    "grep -q 'POST /pg/messages' middleware/access_token_routes.go"
  check "前端按 anthropic 端点与 claude 名称切换 Messages" \
    "grep -q 'ANTHROPIC_ENDPOINT_TYPE' web/src/features/playground/lib/options/playground-option-utils.ts"
  check "后端构建通过" "go build ./..."
  check "透传渠道收到的 Playground 请求体不含 group" \
    "go test ./controller/ -run TestPlaygroundMessagesPassThroughOmitsGroup -count=1"
  check "Playground 路由读取分组" \
    "go test ./middleware/ -run TestGetModelRequestReadsPlaygroundGroupForEveryPlaygroundRoute -count=1"
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "Playground lint 通过" "(cd web && bunx oxlint -c .oxlintrc.json src/features/playground)"
    check "Playground 测试通过" "(cd web && bunx vitest run src/features/playground)"
  else
    skip "前端验证（Bun 未安装）"
  fi
fi

if [[ "$TARGET" == "all" || "$TARGET" == "playground-inline-base64-images" ]]; then
  echo ""
  echo "── playground-inline-base64-images ──"
  check "流式与完成路径提取 base64 Markdown 图片"     "grep -c 'moveInlineImagesToMessage' web/src/features/playground/lib/message/message-streaming-utils.ts | grep -q '^[3-9]'"
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "Playground lint 通过" "(cd web && bunx oxlint -c .oxlintrc.json src/features/playground)"
    check "Playground 测试通过" "(cd web && bunx vitest run src/features/playground)"
  else
    skip "前端验证（Bun 未安装）"
  fi
fi

if [[ "$TARGET" == "all" || "$TARGET" == "playground-function-calling" ]]; then
  echo ""
  echo "── playground-function-calling ──"
  check "参数面板含工具定义编辑器"     "grep -q 'PlaygroundToolsEditor' web/src/features/playground/components/input/playground-parameter-panel.tsx"
  check "chat 与 Messages 请求携带 tools"     "grep -q 'toChatCompletionTools' web/src/features/playground/lib/streaming/payload-builder.ts && grep -q 'toMessagesTools' web/src/features/playground/lib/streaming/payload-builder.ts"
  check "Messages 流监听 content_block_start"     "grep -q \"'content_block_start'\" web/src/features/playground/lib/streaming/stream-utils.ts"
  check "对话保存工具调用与 Messages 块"     "grep -q 'toolCalls: z.array' web/src/features/playground/lib/storage/storage-schema.ts && grep -q 'messagesBlocks: z.array' web/src/features/playground/lib/storage/storage-schema.ts"
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "Playground 与 tool 组件 lint 通过" "(cd web && bunx oxlint -c .oxlintrc.json src/features/playground src/components/ai-elements/tool.tsx)"
    check "Playground 测试通过" "(cd web && bunx vitest run src/features/playground)"
  else
    skip "前端验证（Bun 未安装）"
  fi
fi

if [[ "$TARGET" == "all" || "$TARGET" == "playground-hosted-tools" ]]; then
  echo ""
  echo "── playground-hosted-tools ──"
  check "参数面板含托管工具开关"     "grep -q 'PlaygroundHostedToolsEditor' web/src/features/playground/components/input/playground-parameter-panel.tsx"
  check "Messages 发送服务端工具、chat 发送 web_search_options"     "grep -q 'toMessagesServerTools' web/src/features/playground/lib/streaming/payload-builder.ts && grep -q 'web_search_options' web/src/features/playground/lib/streaming/payload-builder.ts"
  check "回传保留服务端工具块与 citations"     "grep -q \"'server_tool_result'\" web/src/features/playground/lib/streaming/messages-blocks.ts && grep -q 'citations_delta' web/src/features/playground/lib/streaming/messages-blocks.ts"
  check "存储保存托管工具开关与服务端工具块"     "grep -q 'hosted_tools' web/src/features/playground/lib/storage/storage-schema.ts && grep -q \"z.literal('server_tool_use')\" web/src/features/playground/lib/storage/storage-schema.ts"
  check "七语言含托管工具文案"     "for f in en zh zh-TW fr ru ja vi; do grep -q '\"Hosted tools\"' web/src/i18n/locales/\$f.json || exit 1; done"
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "Playground lint 通过" "(cd web && bunx oxlint -c .oxlintrc.json src/features/playground)"
    check "Playground 测试通过" "(cd web && bunx vitest run src/features/playground)"
  else
    skip "前端验证（Bun 未安装）"
  fi
fi

if [[ "$TARGET" == "all" || "$TARGET" == "playground-openai-hosted-tools" ]]; then
  echo ""
  echo "── playground-openai-hosted-tools ──"
  check "托管工具按目录端点路由（openai-response / anthropic）"     "grep -q 'OPENAI_RESPONSES_ENDPOINT_TYPE' web/src/features/playground/lib/options/playground-option-utils.ts && grep -q 'getTurnRequestFormat' web/src/features/playground/hooks/use-chat-handler.ts"
  check "Responses 请求携带 web_search / code_interpreter 与 include"     "grep -q \"type: 'code_interpreter'\" web/src/features/playground/lib/tools/hosted-tools.ts && grep -q 'RESPONSES_HOSTED_TOOL_INCLUDE' web/src/features/playground/lib/streaming/payload-builder.ts"
  check "Responses 流解析函数调用与托管调用项"     "grep -q \"'response.function_call_arguments.delta'\" web/src/features/playground/lib/streaming/stream-utils.ts && grep -q 'responsesItem' web/src/features/playground/lib/streaming/stream-utils.ts"
  check "存储保存 Responses 托管调用项"     "grep -q 'responsesItems: z.array' web/src/features/playground/lib/storage/storage-schema.ts"
  if command -v bun &>/dev/null; then
    check "前端类型检查通过" "(cd web && bun run typecheck)"
    check "Playground lint 通过" "(cd web && bunx oxlint -c .oxlintrc.json src/features/playground)"
    check "Playground 测试通过" "(cd web && bunx vitest run src/features/playground)"
  else
    skip "前端验证（Bun 未安装）"
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
