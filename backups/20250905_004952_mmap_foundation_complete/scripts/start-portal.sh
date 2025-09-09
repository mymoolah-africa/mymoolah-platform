#!/bin/bash

# MyMoolah Admin Portal Startup Script
# This script starts both the portal backend and frontend servers

echo "🚀 Starting MyMoolah Admin Portal..."
echo ""

# Check if we're in the right directory
if [ ! -d "portal" ]; then
    echo "❌ Error: Please run this script from the /mymoolah directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: /Users/andremacbookpro/mymoolah"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $port is already in use"
        return 1
    else
        echo "✅ Port $port is available"
        return 0
    fi
}

# Check ports
echo "🔍 Checking port availability..."
check_port 3002 || { echo "❌ Portal backend port 3002 is in use. Please stop the service using that port."; exit 1; }
check_port 3003 || { echo "❌ Portal frontend port 3003 is in use. Please stop the service using that port."; exit 1; }

echo ""
echo "📦 Starting Portal Backend (Port 3002)..."
cd portal/backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

echo "📦 Starting Portal Frontend (Port 3003)..."
cd ../admin/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Portal servers started successfully!"
echo ""
echo "🌐 Access URLs:"
echo "   Admin Portal: http://localhost:3003"
echo "   Backend API:  http://localhost:3002/api/v1"
echo ""
echo "🔐 Test Credentials:"
echo "   Email:    admin@mymoolah.com"
echo "   Password: Admin@123!"
echo ""
echo "📋 Server PIDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop servers, run:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📝 Logs will appear below. Press Ctrl+C to stop all servers."

# Wait for user to stop
wait
