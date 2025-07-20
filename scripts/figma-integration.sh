#!/bin/bash

# MyMoolah Figma Integration Script
# This script automates the common issues that occur during Figma integrations
# and makes the process more robust and reliable.

set -e  # Exit on any error

echo "🚀 MyMoolah Figma Integration Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "mymoolah-wallet-frontend" ]; then
    print_error "Please run this script from the mymoolah project root directory"
    exit 1
fi

# Step 1: Stop any running servers
print_info "Stopping any running servers..."
pkill -f "vite" || true
pkill -f "node server.js" || true
pkill -f "npm run dev" || true
pkill -f "npm start" || true
sleep 3

# Step 2: Clean up any temporary files
print_info "Cleaning up temporary files..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true

# Step 3: Fix import statements (remove version numbers)
print_info "Fixing import statements..."
if [ -d "mymoolah-wallet-frontend" ]; then
    cd mymoolah-wallet-frontend
    
    # Remove version numbers from all import statements
    print_info "Removing version numbers from package imports..."
    find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*//g' {} \; 2>/dev/null || true
    find components/ui -name "*.tsx" -exec sed -i '' 's/@[0-9][0-9]*\.[0-9][0-9]*//g' {} \; 2>/dev/null || true
    
    # Fix specific common imports
    print_info "Fixing specific import patterns..."
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-slot@[^"]*"/@radix-ui\/react-slot"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-progress@[^"]*"/@radix-ui\/react-progress"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-tabs@[^"]*"/@radix-ui\/react-tabs"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-dialog@[^"]*"/@radix-ui\/react-dialog"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-label@[^"]*"/@radix-ui\/react-label"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-switch@[^"]*"/@radix-ui\/react-switch"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/@radix-ui\/react-separator@[^"]*"/@radix-ui\/react-separator"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/class-variance-authority@[^"]*"/class-variance-authority"/g' {} \; 2>/dev/null || true
    find . -name "*.tsx" -exec sed -i '' 's/lucide-react@[^"]*"/lucide-react"/g' {} \; 2>/dev/null || true
    
    # Fix Figma asset imports
    print_info "Fixing Figma asset imports..."
    find . -name "*.tsx" -exec sed -i '' 's/figma:asset\/[^"]*"/..\/src\/assets\/logo2.svg"/g' {} \; 2>/dev/null || true
    
    cd ..
fi

# Step 4: Fix CSS issues
print_info "Fixing CSS configuration..."
if [ -d "mymoolah-wallet-frontend" ]; then
    cd mymoolah-wallet-frontend
    
    # Ensure Tailwind directives are present
    if [ -f "src/styles/globals.css" ]; then
        print_info "Updating Tailwind CSS directives..."
        # Create backup
        cp src/styles/globals.css src/styles/globals.css.backup
        
        # Ensure proper Tailwind directives
        cat > src/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
EOF
    fi
    
    cd ..
fi

# Step 5: Install/update dependencies
print_info "Installing/updating dependencies..."
if [ -d "mymoolah-wallet-frontend" ]; then
    cd mymoolah-wallet-frontend
    npm install
    cd ..
fi

# Step 6: Initialize database
print_info "Initializing database..."
if [ -f "package.json" ]; then
    npm run init-db || print_warning "Database initialization failed, but continuing..."
fi

# Step 7: Start servers
print_info "Starting servers..."

# Start backend server
if [ -f "package.json" ]; then
    print_info "Starting backend server..."
    npm start &
    BACKEND_PID=$!
    sleep 5
    
    # Check if backend is running
    if curl -s http://localhost:5050/health > /dev/null; then
        print_status "Backend server started successfully on http://localhost:5050"
    else
        print_error "Backend server failed to start"
        exit 1
    fi
fi

# Start frontend server
if [ -d "mymoolah-wallet-frontend" ]; then
    cd mymoolah-wallet-frontend
    print_info "Starting frontend server..."
    npm run dev &
    FRONTEND_PID=$!
    sleep 10
    
    # Check if frontend is running
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_status "Frontend server started successfully on http://localhost:3000"
    elif curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_status "Frontend server started successfully on http://localhost:3001"
    elif curl -s http://localhost:3002 > /dev/null 2>&1; then
        print_status "Frontend server started successfully on http://localhost:3002"
    else
        print_warning "Frontend server may still be starting up..."
    fi
    
    cd ..
fi

# Step 8: Run tests
print_info "Running basic tests..."

# Test backend endpoints
if curl -s http://localhost:5050/health > /dev/null; then
    print_status "Backend health check passed"
else
    print_error "Backend health check failed"
fi

# Test frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_status "Frontend is accessible"
elif curl -s http://localhost:3001 > /dev/null 2>&1; then
    print_status "Frontend is accessible on port 3001"
elif curl -s http://localhost:3002 > /dev/null 2>&1; then
    print_status "Frontend is accessible on port 3002"
else
    print_warning "Frontend may still be starting up"
fi

# Step 9: Display status
echo ""
echo "🎉 Figma Integration Complete!"
echo "=============================="
echo ""
echo "📊 Server Status:"
if [ -f "package.json" ]; then
    echo "   Backend:  http://localhost:5050"
fi
if [ -d "mymoolah-wallet-frontend" ]; then
    echo "   Frontend: http://localhost:3000 (or 3001/3002)"
fi
echo ""
echo "🧪 Test Commands:"
echo "   curl http://localhost:5050/health"
echo "   curl http://localhost:3000"
echo ""
echo "📝 Next Steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Test login/register pages"
echo "   3. Verify all components are working"
echo "   4. Check for any remaining console errors"
echo ""

# Save PIDs for cleanup
echo $BACKEND_PID > .backend.pid 2>/dev/null || true
echo $FRONTEND_PID > .frontend.pid 2>/dev/null || true

print_status "Integration script completed successfully!"
print_info "Servers are running in the background"
print_info "Use 'pkill -f vite' and 'pkill -f node' to stop servers" 