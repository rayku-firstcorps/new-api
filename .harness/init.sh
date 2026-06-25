#!/bin/bash
# Harness 初始化脚本 — 每次 AI 会话开始时执行
# 用途：验证环境就绪，打印当前进度，明确本次工作范围

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  new-api Harness 会话初始化"
echo "=========================================="

# 1. 检查 Go 环境
echo ""
echo "[ 1/4 ] 检查 Go 环境..."
if command -v go &>/dev/null; then
  GO_VERSION=$(go version | awk '{print $3}')
  echo -e "  ${GREEN}✓${NC} Go: $GO_VERSION"
  # 检查 go.mod 存在
  if [ -f "go.mod" ]; then
    MODULE=$(head -1 go.mod | awk '{print $2}')
    echo -e "  ${GREEN}✓${NC} 模块: $MODULE"
  fi
else
  echo -e "  ${RED}✗${NC} Go 未安装或不在 PATH"
  exit 1
fi

# 2. 检查前端环境
echo ""
echo "[ 2/4 ] 检查前端环境..."
if command -v bun &>/dev/null; then
  BUN_VERSION=$(bun --version)
  echo -e "  ${GREEN}✓${NC} Bun: $BUN_VERSION"
  if [ -d "web/default/node_modules" ]; then
    echo -e "  ${GREEN}✓${NC} 前端依赖已安装"
  else
    echo -e "  ${YELLOW}⚠${NC} 前端依赖未安装，运行 cd web/default && bun install"
  fi
else
  echo -e "  ${YELLOW}⚠${NC} Bun 未安装，前端任务将不可用"
fi

# 3. 显示当前功能进度
echo ""
echo "[ 3/4 ] 当前功能状态（Stage 1）..."
if command -v jq &>/dev/null; then
  TOTAL=$(jq '.features | length' .harness/feature_list.json)
  DONE=$(jq '[.features[] | select(.status == "done")] | length' .harness/feature_list.json)
  INPROGRESS=$(jq '[.features[] | select(.status == "in_progress")] | length' .harness/feature_list.json)
  echo -e "  进度: ${GREEN}${DONE}${NC}/${TOTAL} 完成，${YELLOW}${INPROGRESS}${NC} 进行中"
  echo ""
  jq -r '.features[] |
    if .status == "done" then "  [[32m✓ done[0m]       \(.title)"
    elif .status == "in_progress" then "  [[33m→ in_progress[0m] \(.title)"
    else "  [[90m○ pending[0m]    \(.title)"
    end' .harness/feature_list.json
else
  echo "  (安装 jq 以显示结构化进度，当前显示原始列表)"
  grep -E '"title"|"status"' .harness/feature_list.json | paste - - | \
    sed 's/.*"title": "\(.*\)".*/\1/' | head -20
fi

# 4. 显示会话进度文件摘要
echo ""
echo "[ 4/4 ] 上次会话状态..."
if [ -f "claude-progress.md" ]; then
  # 打印 "上次停在哪里" 到 "已知问题" 之间的内容
  echo -e "  ${CYAN}--- claude-progress.md 摘要 ---${NC}"
  sed -n '/## 上次停在哪里/,/## 已知问题/p' claude-progress.md | head -15 | sed 's/^/  /'
else
  echo -e "  ${YELLOW}⚠${NC} 未找到 claude-progress.md，这是首次会话"
fi

echo ""
echo "=========================================="
echo -e "  ${GREEN}初始化完成，可以开始工作${NC}"
echo "=========================================="
echo ""
echo -e "${CYAN}工作规范提示：${NC}"
echo "  • 每次会话只处理一个 pending feature（单功能原则）"
echo "  • 完成后在 .harness/feature_list.json 中将 status 改为 'done'"
echo "  • 会话结束前将进度摘要写入 claude-progress.md"
echo "  • 验收前运行 bash .harness/verify.sh"
echo "  • out_of_scope 中的功能本 Stage 内不实现"
echo ""
