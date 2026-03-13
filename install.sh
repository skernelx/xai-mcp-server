#!/bin/bash
set -e

# xAI MCP Server Installer
# Installs the xAI MCP server and configures Claude Code

REPO="${XAI_MCP_REPO:-skernelx/xai-mcp-server}"
INSTALL_DIR="$HOME/.xai-mcp-server"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║      xAI MCP Server Installer         ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18+ required. Found: $(node -v)${NC}"
    exit 1
fi

# Get absolute path to node (important for nvm users)
NODE_PATH=$(which node)
echo -e "${GREEN}✓${NC} Node.js $(node -v) detected at $NODE_PATH"

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    exit 1
fi

# Check for claude CLI
if ! command -v claude &> /dev/null; then
    echo -e "${RED}Error: Claude Code CLI is not installed.${NC}"
    echo "Please install Claude Code from: https://claude.ai/download"
    exit 1
fi

echo -e "${GREEN}✓${NC} Claude Code CLI detected"

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}→${NC} Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull origin main
else
    echo -e "${YELLOW}→${NC} Cloning repository..."
    git clone "https://github.com/$REPO.git" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies and build
echo -e "${YELLOW}→${NC} Installing dependencies..."
npm install --silent

echo -e "${YELLOW}→${NC} Building TypeScript..."
npm run build

if [ ! -f "$INSTALL_DIR/dist/index.js" ]; then
    echo -e "${RED}Error: Build failed. dist/index.js not found.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Build complete"

# Get API key
echo ""
echo -e "${BLUE}xAI API Key Setup${NC}"
echo "Get your API key from: https://x.ai/api"
echo ""

if [ -t 0 ]; then
    read -p "Enter your xAI API key (or press Enter to skip): " API_KEY
else
    API_KEY=""
fi

if [ -z "$API_KEY" ]; then
    API_KEY="xai-your-api-key-here"
    echo -e "${YELLOW}⚠${NC}  Skipped. You'll need to add your API key later."
fi

# Get optional custom base URL
echo ""
echo -e "${BLUE}Optional Custom Gateway${NC}"
echo "If you use an xAI-compatible proxy or gateway, enter its full /v1 base URL."
echo "Example: https://your-gateway.example/v1"
echo ""

if [ -t 0 ]; then
    read -p "Enter custom XAI_BASE_URL (or press Enter to use official xAI API): " BASE_URL
else
    BASE_URL=""
fi

echo ""
echo -e "${BLUE}Optional Default Text Model${NC}"
echo "Used for chat and live search when you do not pass a model explicitly."
echo "Example: grok-4.1-fast"
echo ""

if [ -t 0 ]; then
    read -p "Enter default XAI_MODEL (or press Enter to use built-in defaults): " MODEL_NAME
else
    MODEL_NAME=""
fi

# Configure Claude Code MCP server
echo ""
echo -e "${YELLOW}→${NC} Configuring Claude Code MCP server..."

# Remove existing xai server if present
claude mcp remove xai 2>/dev/null || true

# Add the MCP server using the CLI
MCP_ENV_ARGS=(-e "XAI_API_KEY=$API_KEY")
if [ -n "$BASE_URL" ]; then
    MCP_ENV_ARGS+=(-e "XAI_BASE_URL=$BASE_URL")
fi
if [ -n "$MODEL_NAME" ]; then
    MCP_ENV_ARGS+=(-e "XAI_MODEL=$MODEL_NAME")
fi

claude mcp add xai "${MCP_ENV_ARGS[@]}" -- "$NODE_PATH" "$INSTALL_DIR/dist/index.js"

echo -e "${GREEN}✓${NC} MCP server configured"

# Install skill file
echo -e "${YELLOW}→${NC} Installing xai-grok skill..."
mkdir -p "$HOME/.claude/skills/xai-grok"
cp "$INSTALL_DIR/skill/SKILL.md" "$HOME/.claude/skills/xai-grok/SKILL.md"
echo -e "${GREEN}✓${NC} Skill installed"

# Done
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Installation Complete!           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo "Installed to: $INSTALL_DIR"
echo "Skill:        ~/.claude/skills/xai-grok/"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Restart Claude Code"
echo "2. Run: claude mcp list (to verify xai is connected)"
echo "3. Try: \"Using grok imagine, generate a sunset over mountains\""
echo ""

if [ "$API_KEY" = "xai-your-api-key-here" ]; then
    echo -e "${YELLOW}Remember to update your API key:${NC}"
    echo "  claude mcp remove xai"
    if [ -n "$BASE_URL" ]; then
        if [ -n "$MODEL_NAME" ]; then
            echo "  claude mcp add xai -e XAI_API_KEY=your-key -e XAI_BASE_URL=$BASE_URL -e XAI_MODEL=$MODEL_NAME -- $NODE_PATH $INSTALL_DIR/dist/index.js"
        else
            echo "  claude mcp add xai -e XAI_API_KEY=your-key -e XAI_BASE_URL=$BASE_URL -- $NODE_PATH $INSTALL_DIR/dist/index.js"
        fi
    else
        if [ -n "$MODEL_NAME" ]; then
            echo "  claude mcp add xai -e XAI_API_KEY=your-key -e XAI_MODEL=$MODEL_NAME -- $NODE_PATH $INSTALL_DIR/dist/index.js"
        else
            echo "  claude mcp add xai -e XAI_API_KEY=your-key -- $NODE_PATH $INSTALL_DIR/dist/index.js"
        fi
    fi
    echo ""
fi
