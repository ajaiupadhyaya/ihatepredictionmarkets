# Prediction Markets Atlas - Startup Guide

## 🚀 How to Run the Application

The app now uses a **backend proxy server** to fetch API data, which solves all CORS issues and makes Metaculus work reliably.

### Option 1: Start Both Servers at Once (Recommended)

```bash
./start.sh
```

This will:
- Start the backend API proxy server on **port 3001**
- Start the frontend dev server on **port 5173**
- Handle graceful shutdown when you press Ctrl+C

### Option 2: Run Servers Separately

**Terminal 1 - Start backend:**
```bash
npm run server
```

**Terminal 2 - Start frontend:**
```bash
npm run dev
```

### Option 3: Run Full Stack Together (npm)

```bash
npm run dev-full
```

## 📊 Architecture

The app now uses a **three-tier architecture**:

```
┌─────────────────────────────────────────┐
│   Frontend (Vite, Port 5173)            │
│   - Renders UI                          │
│   - Calls backend API endpoints         │
└──────────────┬──────────────────────────┘
               │ HTTP Requests
               ▼
┌─────────────────────────────────────────┐
│   Backend Proxy Server (Node, Port 3001)│
│   - Fetches from APIs server-to-server  │
│   - No CORS issues!                     │
│   - Caches responses                    │
│   - Handles rate limiting               │
└──────────────┬──────────────────────────┘
               │ HTTP Requests
               ▼
┌─────────────────────────────────────────┐
│   Prediction Market APIs                │
│   - Polymarket (CLOB)                   │
│   - Kalshi (Elections)                  │
│   - Metaculus (Questions)               │
└─────────────────────────────────────────┘
```

## 🔌 API Endpoints

The backend proxy exposes these endpoints:

- `GET http://localhost:3001/health` - Health check
- `GET http://localhost:3001/api/polymarket` - Polymarket data
- `GET http://localhost:3001/api/kalshi` - Kalshi data
- `GET http://localhost:3001/api/metaculus` - Metaculus data

## ✅ What's Fixed

1. **CORS Issues**: All APIs now go through backend proxy (no browser CORS limits)
2. **Metaculus Integration**: Now fully supported with fallback endpoints and caching
3. **Rate Limiting**: Requests are cached for 5 minutes to avoid hammering APIs
4. **Reliability**: Multiple endpoint fallbacks if one fails

## 📈 Current Data Status

When you start the app, console shows:
- ✅ Polymarket: ~1000 markets
- ✅ Kalshi: ~100 markets  
- ✅ Metaculus: ~100+ questions (if proxies work)
- **Total**: 1100-1200 markets available

## 🔧 Troubleshooting

### Backend not starting on port 3001?
```bash
# Kill existing process on port 3001
lsof -ti:3001 | xargs kill -9

# Try again
npm run server
```

### Frontend not connecting to backend?
Make sure both servers are running:
```bash
# Check port 3001
curl http://localhost:3001/health

# Check port 5173
curl http://localhost:5173
```

### Metaculus data not showing?
- Check backend console for "Endpoint HTTP 429" (rate limiting) 
- Cache will hold data for 5 minutes
- Public Metaculus API has rate limits - we handle this automatically

## 📝 Files

- `server.js` - Backend proxy server (NEW)
- `start.sh` - Startup script to run both servers (NEW)
- `package.json` - Updated with `server` and `dev-full` scripts
- `data/*.js` - Updated to use backend proxy endpoints
- `index.html` - Unchanged (Tailwind CSS now via PostCSS)

---

Enjoy your prediction markets analysis! 🎉
