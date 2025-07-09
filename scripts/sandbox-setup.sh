#!/bin/bash

# MyMoolah Mojaloop Sandbox Management Script
# Best Practice: Always use sandbox for development and integration testing

set -e  # Exit on any error

echo "🚀 MyMoolah Mojaloop Sandbox Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
    print_success "Docker is running"
}

# Clean up any existing containers
cleanup_existing() {
    print_status "Cleaning up existing containers..."
    
    # Stop all running containers
    if [ "$(docker ps -q)" ]; then
        docker stop $(docker ps -q)
        print_status "Stopped all running containers"
    fi
    
    # Remove all containers
    if [ "$(docker ps -aq)" ]; then
        docker rm $(docker ps -aq)
        print_status "Removed all containers"
    fi
    
    # Clean up networks
    docker network prune -f
    print_success "Cleanup completed"
}

# Start Mojaloop sandbox
start_sandbox() {
    print_status "Starting Mojaloop sandbox..."
    
    # Check if docker-compose.yml exists
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Please ensure you're in the correct directory."
        exit 1
    fi
    
    # Start the sandbox
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service status
    docker-compose ps
    
    print_success "Mojaloop sandbox started successfully"
}

# Verify sandbox health
verify_sandbox() {
    print_status "Verifying sandbox health..."
    
    # Check if key services are running
    local services=("mysql" "redis" "kafka" "ml-api-adapter")
    
    for service in "${services[@]}"; do
        if docker-compose ps | grep -q "$service.*Up"; then
            print_success "$service is running"
        else
            print_warning "$service may not be ready yet"
        fi
    done
    
    # Check if testing toolkit UI is accessible
    if curl -s http://localhost:9660 > /dev/null 2>&1; then
        print_success "Testing Toolkit UI is accessible at http://localhost:9660"
    else
        print_warning "Testing Toolkit UI may not be ready yet"
    fi
}

# Display sandbox information
show_info() {
    echo ""
    echo "📋 Mojaloop Sandbox Information"
    echo "================================"
    echo "🌐 Testing Toolkit UI: http://localhost:9660"
    echo "🗄️  MySQL Database: localhost:3306"
    echo "📊 Redis Cache: localhost:6379"
    echo "📨 Kafka Message Broker: localhost:9092"
    echo ""
    echo "📚 Useful Commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop sandbox: docker-compose down"
    echo "  - Reset sandbox: ./scripts/sandbox-reset.sh"
    echo "  - Check status: docker-compose ps"
    echo ""
}

# Main execution
main() {
    echo "Starting MyMoolah Mojaloop Sandbox setup..."
    echo ""
    
    check_docker
    cleanup_existing
    start_sandbox
    verify_sandbox
    show_info
    
    print_success "🎉 Sandbox setup completed successfully!"
    print_status "You can now start developing and testing integrations safely."
}

# Run main function
main "$@" 