# Aegis-1: Climate Research & Disaster Relief System

A multi-agent AI system for climate research and disaster relief coordination, built with MCP (Model Context Protocol) tooling.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AEGIS-1 MISSION CONTROL                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  WATCHMAN    │  │   VISION     │  │   CLIMATE    │           │
│  │  (Triage)    │──│  SPECIALIST  │──│   ANALYST    │           │
│  │  Claude 3.5  │  │  Gemini 2.0  │  │  Claude 3.5  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
├─────────────────────────────────────────────────────────────────┤
│                        MCP MESH                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │ relief-ops │  │ open-meteo │  │ nasa-firms │                  │
│  │   (local)  │  │ (external) │  │ (external) │                  │
│  └────────────┘  └────────────┘  └────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
dedalus/
├── backend/                 # Python MCP Server & Agents
│   ├── dedalus_mcp/        # MCP framework
│   ├── dedalus_labs/       # Agent framework
│   ├── aegis_v2/           # Advanced agent orchestration
│   ├── relief_ops.py       # MCP server with relief tools
│   ├── gesture_controller.py # WebSocket gesture server
│   └── requirements.txt
│
├── dashboard/              # Next.js Frontend
│   ├── app/               # Next.js App Router
│   │   ├── jarvis/        # Jarvis-style HUD page
│   │   └── page.tsx       # Main dashboard
│   ├── components/        # React components
│   │   ├── hud/          # HUD components (ArcReactor, etc.)
│   │   └── globe/        # 3D globe visualization
│   └── hooks/            # Custom React hooks
│
├── docker-compose.yml     # Full stack deployment
├── vercel.json           # Vercel deployment config
├── render.yaml           # Render deployment config
└── nixpacks.toml         # Railway deployment config
```

## 🚀 Quick Start

### Local Development

```bash
# 1. Install backend dependencies
cd backend
pip install -r requirements.txt

# 2. Start MCP server
python relief_ops.py

# 3. Start gesture controller (new terminal)
python gesture_controller.py

# 4. Install frontend dependencies
cd ../dashboard
npm install

# 5. Start dashboard
npm run dev
```

Visit: http://localhost:3000/jarvis

### Environment Variables

Create `.env` files or set these variables:

**Backend:**
```env
HOST=0.0.0.0
PORT=8000
MCP_SERVER_NAME=relief-ops
GESTURE_WS_HOST=0.0.0.0
GESTURE_WS_PORT=8765
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key
```

**Dashboard:**
```env
NEXT_PUBLIC_GESTURE_WS_URL=ws://localhost:8765
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MCP_SERVERS=http://localhost:8000/mcp
```

## 🐳 Docker Deployment

```bash
# Build and run all services
docker-compose up --build

# Or build individually
docker build -t aegis-mcp ./backend
docker build -t aegis-dashboard ./dashboard
```

## ☁️ Cloud Deployment

### Vercel (Dashboard only)
```bash
cd dashboard
vercel
```

### Railway
```bash
# Backend
railway init
railway up
```

### Render
Uses `render.yaml` - just connect your repo.

### Dedalus/Custom Platform

For platforms that need explicit build instructions:

**Build Command:**
```bash
cd backend && pip install -r requirements.txt
```

**Start Command:**
```bash
cd backend && python relief_ops.py
```

**Or for dashboard:**
```bash
cd dashboard && npm install && npm run build && npm start
```

## 🛠️ MCP Tools Available

| Tool | Description |
|------|-------------|
| `calculate_supply_needs` | Calculate relief supplies for disaster type & population |
| `prioritize_zones` | Sort zones by risk/urgency |
| `logistics_router` | Calculate relief travel routes |
| `generate_crisis_report` | Generate markdown crisis action report |

## 🤖 Multi-Agent System

1. **Watchman (Triage)** - Routes alerts to specialists
2. **Vision Specialist** - Analyzes satellite/drone imagery
3. **Climate Analyst** - Weather data & resource calculation

### Advanced v2.0 Features:
- Dynamic model routing (cost/latency optimization)
- Multi-MCP server mesh
- Real-time capability scoring

## 📡 API Endpoints

- `POST /mcp` - MCP protocol endpoint
- `GET /health` - Health check
- `WS ws://host:8765` - Gesture/event streaming

## 🎨 Dashboard Features

- **3D Holographic Globe** - Crisis zone visualization
- **Arc Reactor Visualizer** - Voice activity indicator
- **Matrix Text Feed** - Satellite intake display
- **Real-time HUD** - Agent status & tool execution
- **DAuth Status Bar** - Intent signing visualization

## 📄 License

MIT
