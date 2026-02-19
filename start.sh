#!/bin/bash

# Prediction Markets Atlas - Full Stack Startup Script
# Runs both the backend API proxy server and frontend dev server

set -e

echo "🚀 Starting Prediction Markets Atlas (Full Stack)..."
echo ""

# Check if backend server is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Backend server already running on port 3001"
    echo "   Killing existing process..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Check if frontend dev server is already running  
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Frontend server already running on port 5173"
    echo "   Killing existing process..."
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

echo ""
echo "Starting backend API proxy server (port 3001)..."
node server.js &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

sleep 2

echo ""
echo "Starting frontend dev server (port 5173)..."
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║        🎉 Both Servers Running!        ║"
echo "╠════════════════════════════════════════╣"
echo "║ Backend:  http://localhost:3001        ║"
echo "║ Frontend: http://localhost:5173        ║"
echo "║                                        ║"
echo "║ Press Ctrl+C to stop both servers      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Handle shutdown
trap cleanup SIGINT
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait 2>/dev/null || true
    echo "✅ All servers stopped"
}

# Wait for both processes
wait
