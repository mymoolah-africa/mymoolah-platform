#!/bin/bash

# MyMoolah Mojaloop Sandbox Reset Script
# Best Practice: Reset sandbox regularly to avoid stale data and conflicts

set -e  # Exit on any error

echo "🔄 MyMoolah Mojaloop Sandbox Reset"
echo "===================================="

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

# Confirm reset action
confirm_reset() {
    echo ""
    print_warning "This will completely reset the sandbox environment."
    print_warning "All test data, configurations, and containers will be removed."
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Reset cancelled."
        exit 0
    fi
}

# Stop and remove all containers
stop_containers() {
    print_status "Stopping all containers..."
    
    if [ "$(docker ps -q)" ]; then
        docker stop $(docker ps -q)
        print_success "All containers stopped"
    else
        print_status "No running containers found"
    fi
}

# Remove all containers
remove_containers() {
    print_status "Removing all containers..."
    
    if [ "$(docker ps -aq)" ]; then
        docker rm $(docker ps -aq)
        print_success "All containers removed"
    else
        print_status "No containers to remove"
    fi
}

# Clean up Docker resources
cleanup_docker() {
    print_status "Cleaning up Docker resources..."
    
    # Remove unused networks
    docker network prune -f
    
    # Remove unused volumes (optional - be careful with this)
    echo ""
    read -p "Do you want to remove unused volumes? This will delete all test data. (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker volume prune -f
        print_success "Unused volumes removed"
    else
        print_status "Volumes preserved"
    fi
    
    # Remove unused images (optional)
    echo ""
    read -p "Do you want to remove unused images? This will free up disk space. (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker image prune -f
        print_success "Unused images removed"
    else
        print_status "Images preserved"
    fi
}

# Verify clean state
verify_clean_state() {
    print_status "Verifying clean state..."
    
    if [ -z "$(docker ps -aq)" ]; then
        print_success "No containers remaining"
    else
        print_warning "Some containers may still exist"
        docker ps -a
    fi
    
    if [ -z "$(docker network ls -q)" ]; then
        print_success "No custom networks remaining"
    else
        print_warning "Some networks may still exist"
        docker network ls
    fi
}

# Display reset completion
show_completion() {
    echo ""
    echo "✅ Sandbox Reset Complete"
    echo "========================"
    echo ""
    echo "📋 What was cleaned:"
    echo "  - All running containers stopped"
    echo "  - All containers removed"
    echo "  - Unused networks cleaned"
    echo "  - Unused volumes (if selected)"
    echo "  - Unused images (if selected)"
    echo ""
    echo "🚀 Next Steps:"
    echo "  - Run: ./scripts/sandbox-setup.sh to start fresh sandbox"
    echo "  - Or run: docker-compose up -d to start with current config"
    echo ""
}

# Main execution
main() {
    confirm_reset
    stop_containers
    remove_containers
    cleanup_docker
    verify_clean_state
    show_completion
    
    print_success "🎉 Sandbox reset completed successfully!"
    print_status "You can now start a fresh sandbox environment."
}

# Run main function
main "$@" 