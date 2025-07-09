# MyMoolah Setup Guide

**Complete Development Environment Setup for MyMoolah Platform**

## 🎯 Overview

This guide provides step-by-step instructions to set up the complete MyMoolah development environment, including the Mojaloop Testing Toolkit, backend services, and frontend application.

## 📋 Prerequisites

### Required Software
- **Docker Desktop** (v20.10+) - [Download](https://www.docker.com/products/docker-desktop)
- **Git** (v2.30+) - [Download](https://git-scm.com/)
- **Node.js** (v18+) - [Download](https://nodejs.org/)
- **VS Code** (Recommended) - [Download](https://code.visualstudio.com/)

### System Requirements
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 10GB free space
- **OS**: macOS 12+, Windows 10+, or Ubuntu 20.04+

## 🚀 Quick Setup (5 minutes)

### 1. Clone Repository
```bash
git clone https://github.com/mymoolah-africa/mymoolah-platform.git
cd mymoolah-platform
```

### 2. Start All Services
```bash
# Build custom UI image
docker build -f Dockerfile.ui -t mymoolah-ml-testing-toolkit-ui:custom .

# Start all services
docker-compose up -d

# Verify all containers are running
docker-compose ps
```

### 3. Access Services
- **Testing Toolkit UI**: http://localhost:9661
- **Testing Toolkit API**: http://localhost:5050
- **MySQL Database**: localhost:3306
- **Redis Cache**: localhost:6379

## 🔧 Detailed Setup

### Step 1: Environment Preparation

#### Install Docker Desktop
1. Download Docker Desktop for your OS
2. Install and start Docker Desktop
3. Verify installation:
```bash
docker --version
docker-compose --version
```

#### Install Node.js
1. Download Node.js 18+ from nodejs.org
2. Verify installation:
```bash
node --version
npm --version
```

#### Install Git
1. Download Git from git-scm.com
2. Configure Git:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Step 2: Project Setup

#### Clone Repository
```bash
git clone https://github.com/mymoolah-africa/mymoolah-platform.git
cd mymoolah-platform
```

#### Verify Project Structure
```bash
ls -la
# Should show:
# - docker-compose.yml
# - Dockerfile.ui
# - nginx.conf
# - package.json
# - mymoolah-wallet-frontend/
# - docs/
# - etc.
```

### Step 3: Docker Services Setup

#### Build Custom UI Image
```bash
# Build the custom Mojaloop Testing Toolkit UI
docker build -f Dockerfile.ui -t mymoolah-ml-testing-toolkit-ui:custom .
```

#### Start All Services
```bash
# Start all containers in detached mode
docker-compose up -d

# Check container status
docker-compose ps
```

#### Verify Services
```bash
# Check if all containers are healthy
docker-compose ps

# Check container logs for any errors
docker-compose logs
```

### Step 4: Service Verification

#### Test Mojaloop Testing Toolkit
1. Open browser to http://localhost:9661
2. Should see "Welcome to Testing Toolkit"
3. Navigate through the UI to verify functionality

#### Test API Endpoints
```bash
# Test API health
curl http://localhost:5050/api/config/user

# Test database connectivity
curl http://localhost:5050/api/health
```

#### Test Database Connection
```bash
# Connect to MySQL (if you have mysql client)
mysql -h localhost -P 3306 -u mymoolah_user -p mymoolah_sandbox
# Password: mymoolah_pass
```

### Step 5: Development Environment

#### Backend Development
```bash
# Install backend dependencies
npm install

# Start backend server (if needed)
npm start

# Run tests
npm test
```

#### Frontend Development
```bash
# Navigate to frontend directory
cd mymoolah-wallet-frontend

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

## 🔍 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# If containers won't start
docker-compose down
docker system prune -f
docker-compose up -d

# If port conflicts
# Check what's using the ports
lsof -i :9661
lsof -i :5050
lsof -i :3306
```

#### Memory Issues
```bash
# Increase Docker memory in Docker Desktop
# Settings > Resources > Memory: 8GB minimum
```

#### Network Issues
```bash
# Reset Docker network
docker network prune -f
docker-compose down
docker-compose up -d
```

### Service-Specific Issues

#### Mojaloop Testing Toolkit Not Loading
```bash
# Check UI container logs
docker-compose logs ml-testing-toolkit-ui

# Rebuild UI image
docker-compose down
docker build -f Dockerfile.ui -t mymoolah-ml-testing-toolkit-ui:custom .
docker-compose up -d
```

#### Database Connection Issues
```bash
# Check MySQL container
docker-compose logs mysql

# Restart MySQL
docker-compose restart mysql
```

#### API 500 Errors
```bash
# Check API container logs
docker-compose logs ml-testing-toolkit

# Verify API is accessible
curl -v http://localhost:5050/api/config/user
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check all container health
docker-compose ps

# Monitor resource usage
docker stats

# Check disk space
docker system df
```

### Logs
```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs ml-testing-toolkit
docker-compose logs mysql
docker-compose logs redis
```

### Updates
```bash
# Update dependencies
npm update

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 🛠️ Development Workflow

### Daily Development
```bash
# Start services
docker-compose up -d

# Work on backend
npm start

# Work on frontend
cd mymoolah-wallet-frontend
npm run dev

# Stop services when done
docker-compose down
```

### Testing
```bash
# Run backend tests
npm test

# Run frontend tests
cd mymoolah-wallet-frontend
npm test

# Run integration tests
npm run test:integration
```

### Code Quality
```bash
# Lint backend code
npm run lint

# Lint frontend code
cd mymoolah-wallet-frontend
npm run lint

# Format code
npm run format
```

## 🔒 Security Considerations

### Environment Variables
```bash
# Create .env file for local development
cp .env.example .env

# Edit .env with your local settings
nano .env
```

### Access Control
- Never commit `.env` files
- Use strong passwords for databases
- Regularly update dependencies
- Monitor container logs for security issues

## 📚 Additional Resources

### Documentation
- [Project README](../README.md)
- [API Documentation](./openapi.md)
- [Security Guidelines](./SECURITY.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

### External Resources
- [Mojaloop Documentation](https://docs.mojaloop.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [React Documentation](https://react.dev/)

## 🆘 Getting Help

### Internal Support
- Check [docs/](./) for detailed guides
- Review [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current status
- Consult [AGENT_HANDOVER.md](./AGENT_HANDOVER.md) for AI assistant notes

### External Support
- [GitHub Issues](https://github.com/mymoolah-africa/mymoolah-platform/issues)
- [Mojaloop Community](https://mojaloop.io/community/)
- [Docker Community](https://forums.docker.com/)

---

**🎉 Congratulations!** Your MyMoolah development environment is now ready for building the future of African fintech! 