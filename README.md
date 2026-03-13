# xAI MCP Server

A Model Context Protocol (MCP) server that brings xAI's Grok APIs to Claude Code. Generate images, chat with Grok, analyze images, search the web, and create videos—all from natural language prompts in your Claude Code session.

## Features

| Tool | Description |
|------|-------------|
| `generate_image` | Generate images using Grok Imagine |
| `chat` | Chat with Grok models (grok-3, grok-4, grok-3-mini) |
| `analyze_image` | Analyze and describe images with Grok Vision |
| `live_search` | Real-time web, news, and X/Twitter search |
| `generate_video` | Generate videos from text prompts |

## Prerequisites

- **Node.js** 18.0.0 or higher
- **xAI API Key** from [x.ai/api](https://x.ai/api)
- **Claude Code** installed

## Installation

### Option 1: Quick Install (Recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/joemccann/xai-mcp-server/main/install.sh | bash
```

This installs the server and automatically configures Claude Code. You'll be prompted for your xAI API key.

### Option 2: npx from GitHub

No installation needed - runs directly from GitHub:

```bash
npx github:joemccann/xai-mcp-server
```

### Option 3: npm Global Install

```bash
npm install -g @joemccann/xai-mcp-server
```

### Option 4: Clone and Build

```bash
git clone https://github.com/joemccann/xai-mcp-server.git
cd xai-mcp-server
npm install
```

## Configuration for Claude Code

### Step 1: Get Your xAI API Key

1. Go to [x.ai/api](https://x.ai/api)
2. Sign up or log in
3. Create an API key
4. Copy the key (starts with `xai-`)

### Step 2: Configure Claude Code

> **Note:** If you used the Quick Install (Option 1), this is already done for you.

Add the MCP server using the Claude CLI:

```bash
claude mcp add xai -e XAI_API_KEY=xai-your-key-here -- node ~/.xai-mcp-server/dist/index.js
```

**For nvm users**, use the absolute path to node:

```bash
claude mcp add xai -e XAI_API_KEY=xai-your-key-here -- $(which node) ~/.xai-mcp-server/dist/index.js
```

If you use a custom xAI-compatible gateway or proxy, also pass `XAI_BASE_URL`
with the full `/v1` base URL:

```bash
claude mcp add xai \
  -e XAI_API_KEY=xai-your-key-here \
  -e XAI_BASE_URL=https://your-gateway.example/v1 \
  -- $(which node) ~/.xai-mcp-server/dist/index.js
```

If you want chat and live search to default to a specific text model, also set
`XAI_MODEL`. For finer control, `XAI_CHAT_MODEL` and `XAI_SEARCH_MODEL` are
also supported and take precedence over `XAI_MODEL`.

```bash
claude mcp add xai \
  -e XAI_API_KEY=xai-your-key-here \
  -e XAI_BASE_URL=https://your-gateway.example/v1 \
  -e XAI_MODEL=grok-4.1-fast \
  -- $(which node) ~/.xai-mcp-server/dist/index.js
```

Verify it's configured:

```bash
claude mcp list
```

You should see:
```
xai: ... - ✓ Connected
```

### Step 3: Restart Claude Code

Restart Claude Code to load the new MCP server. You should see the xAI tools available.

## Usage

Once configured, you can use natural language to invoke xAI capabilities:

### Image Generation

```
Generate an image of a cyberpunk cityscape at night with neon lights.
```

```
Using grok imagine, create a watercolor painting of a mountain landscape.
```

```
Generate 3 variations of a logo for a coffee shop called "Bean There".
```

### Chat with Grok

```
Ask Grok to explain the theory of relativity in simple terms.
```

```
Have Grok write a haiku about programming.
```

### Image Analysis

```
Analyze this image and describe what you see: https://example.com/photo.jpg
```

```
What text is visible in this screenshot: [image URL]
```

### Live Search

```
Search for the latest news about SpaceX launches.
```

```
Find recent tweets about the new iPhone release.
```

```
Search the web for Python best practices 2024.
```

### Video Generation

```
Generate a 5-second video of clouds moving across a blue sky.
```

```
Create a video animation of a bouncing ball.
```

## Tool Reference

### generate_image

Generate images from text descriptions using Grok Imagine.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Text description of the image |
| `n` | number | No | 1 | Number of images (1-10) |
| `model` | string | No | `grok-2-image-1212` | Image generation model |
| `aspect_ratio` | string | No | - | Aspect ratio (e.g., "16:9", "1:1", "4:3") |
| `response_format` | string | No | `url` | Output format: "url" or "b64_json" |

**Example Response:**
```json
{
  "success": true,
  "images": [
    {
      "index": 1,
      "url": "https://api.x.ai/images/generated/abc123.png",
      "revised_prompt": "A detailed cyberpunk cityscape..."
    }
  ]
}
```

### chat

Chat with Grok language models.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `message` | string | Yes | - | Message to send to Grok |
| `model` | string | No | `grok-3` | Model: grok-3, grok-4, grok-3-mini |
| `system_prompt` | string | No | - | System context/instructions |
| `temperature` | number | No | 0.7 | Sampling temperature (0-2) |
| `max_tokens` | number | No | - | Maximum response tokens |

### analyze_image

Analyze images using Grok's vision capabilities.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `image_url` | string | Yes | - | Image URL or base64 data URL |
| `prompt` | string | No | "Describe this image" | Question or instruction |
| `detail` | string | No | `auto` | Detail level: "low", "high", "auto" |
| `model` | string | No | `grok-2-vision-1212` | Vision model |

### live_search

Perform real-time web searches using Grok.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | - | Search query |
| `sources` | array | No | `["web"]` | Sources: "web", "news", "x" |
| `date_range` | object | No | - | Date filter: `{ start, end }` (YYYY-MM-DD) |
| `max_results` | number | No | 10 | Maximum results (1-20) |

### generate_video

Generate videos from text descriptions.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt` | string | Yes | - | Video description |
| `model` | string | No | `grok-imagine-video` | Video generation model |
| `duration` | number | No | 5 | Duration in seconds (1-15) |
| `image` | string | No | - | Input image URL to animate |
| `video` | string | No | - | Input video URL to edit |
| `aspect_ratio` | string | No | - | Aspect ratio (e.g., "16:9") |
| `wait_for_completion` | boolean | No | true | Wait for video to finish |

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Run the server directly
npm start
```

### Testing

This project includes comprehensive unit tests with pretty table output:

```bash
# Run unit tests (mocked, no API calls)
npm run test

# Run tests with detailed output (shows every individual test)
npm run test:detailed

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run integration tests (requires XAI_API_KEY, optionally uses XAI_BASE_URL / XAI_MODEL)
npm run test:integration
```

**Test Output Features:**
- Color-coded results with status indicators (✓ PASS, ✗ FAIL)
- Performance metrics showing slowest/fastest test files
- Summary table with total stats
- Detailed mode shows individual test durations and suite hierarchy
- All tests use mocked APIs by default (no cost, no API key needed)

### Project Structure

```
xai-mcp-server/
├── src/
│   ├── index.ts           # MCP server entry point
│   ├── xai-client.ts      # xAI API client with types
│   └── tools/
│       ├── generate-image.ts
│       ├── chat.ts
│       ├── vision.ts
│       ├── live-search.ts
│       └── generate-video.ts
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

### "XAI_API_KEY environment variable is required"

Re-add the MCP server with your API key:

```bash
claude mcp remove xai
claude mcp add xai -e XAI_API_KEY=xai-your-key-here -- $(which node) ~/.xai-mcp-server/dist/index.js
```

If you're using a custom gateway, re-add it with `XAI_BASE_URL` too:

```bash
claude mcp remove xai
claude mcp add xai \
  -e XAI_API_KEY=xai-your-key-here \
  -e XAI_BASE_URL=https://your-gateway.example/v1 \
  -- $(which node) ~/.xai-mcp-server/dist/index.js
```

If you want a custom default text model for chat and live search, also pass
`XAI_MODEL`:

```bash
claude mcp remove xai
claude mcp add xai \
  -e XAI_API_KEY=xai-your-key-here \
  -e XAI_BASE_URL=https://your-gateway.example/v1 \
  -e XAI_MODEL=grok-4.1-fast \
  -- $(which node) ~/.xai-mcp-server/dist/index.js
```

### Tools not appearing in Claude Code

1. Run `claude mcp list` to check server status
2. If not listed, add it with `claude mcp add` (see Step 2 above)
3. For nvm users, use absolute node path: `$(which node)`
4. Ensure the project is built (`npm run build`)
5. Restart Claude Code completely

### API errors

- Verify your API key is valid at [x.ai](https://x.ai)
- Check you have sufficient API credits
- Some features may require specific API tier access

## API Reference

This server uses the xAI API. For full API documentation, see:
- [xAI API Reference](https://docs.x.ai/docs/api-reference)
- [Image Generation Guide](https://docs.x.ai/docs/guides/image-generation)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Acknowledgments

- [xAI](https://x.ai) for the Grok API
- [Model Context Protocol](https://modelcontextprotocol.io) for the MCP specification
- [Anthropic](https://anthropic.com) for Claude Code
