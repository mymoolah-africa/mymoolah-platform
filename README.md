# MyMoolah - South African Fintech Wallet Platform

A comprehensive digital wallet and banking platform built on Mojaloop open-source software, designed for the South African market with compliance, security, and best practices at its core.

## 🏗️ Project Architecture

```
mymoolah/
├── docker-compose.yml          # Main Docker orchestration
├── Dockerfile.ui              # Custom UI Docker configuration
├── nginx.conf                 # Nginx proxy configuration
├── server.js                  # Express.js backend server
├── package.json               # Backend dependencies
├── mymoolah-wallet-frontend/  # React/Vite frontend application
├── docs/                      # Comprehensive documentation
├── scripts/                   # Utility scripts
├── tests/                     # Test suites
├── models/                    # Database models
├── routes/                    # API routes
├── controllers/               # Business logic controllers
├── services/                  # External service integrations
└── config/                    # Configuration files
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### 1. Clone and Setup

```bash
git clone https://github.com/mymoolah-africa/mymoolah-platform.git
cd mymoolah-platform
```

### 2. Start Mojaloop Testing Toolkit

```bash
# Build custom UI image
docker build -f Dockerfile.ui -t mymoolah-ml-testing-toolkit-ui:custom .

# Start all services
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Access Services

- **Testing Toolkit UI**: http://localhost:9661
- **Testing Toolkit API**: http://localhost:5050
- **MySQL Database**: localhost:3306
- **Redis Cache**: localhost:6379
- **Kafka Message Broker**: localhost:9092

### 4. Development Workflow

```bash
# Frontend development
cd mymoolah-wallet-frontend
npm install
npm run dev

# Backend development
npm install
npm start

# Run tests
npm test
```

## 🏛️ Technology Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **Redis** caching
- **Kafka** message broker
- **JWT** authentication
- **bcrypt** password hashing

### Frontend
- **React 18** with TypeScript
- **Vite** build tool
- **Tailwind CSS** styling
- **Heroicons** UI components
- **ESLint** code quality

### Infrastructure
- **Docker** containerization
- **Mojaloop Testing Toolkit** for API testing
- **Nginx** reverse proxy
- **GitHub** version control

## 📚 Documentation

### Core Documentation
- [Project Onboarding](./docs/PROJECT_ONBOARDING.md) - New developer setup
- [Backend Verification Checklist](./docs/BACKEND_VERIFICATION_CHECKLIST.md) - Backend testing guide
- [Sandbox Best Practices](./docs/SANDBOX_BEST_PRACTICES.md) - Development environment guidelines
- [Mojaloop Integration](./docs/mojaloop-integration.md) - Mojaloop API integration
- [Security Guidelines](./docs/SECURITY.md) - Security best practices

### API Documentation
- [OpenAPI Specification](./docs/openapi.yaml) - Complete API documentation
- [API Reference](./docs/openapi.md) - Interactive API docs

### Development Workflow
- [Git Sync Workflow](./docs/git-sync-workflow.md) - Version control best practices
- [Contributing Guidelines](./docs/CONTRIBUTING.md) - How to contribute
- [Agent Handover](./docs/AGENT_HANDOVER.md) - AI assistant handover notes

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mymoolah_sandbox
DB_USER=mymoolah_user
DB_PASSWORD=mymoolah_pass

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Mojaloop
MOJALOOP_API_URL=http://localhost:5050
MOJALOOP_UI_URL=http://localhost:9661
```

### Docker Configuration

The `docker-compose.yml` includes:
- **MySQL 8.0** - Primary database
- **Redis 6.2** - Caching layer
- **Kafka 7.4.0** - Message broker
- **Zookeeper** - Kafka dependency
- **Mojaloop Testing Toolkit** - API testing platform
- **Custom UI** - Nginx-proxied React application

## 🧪 Testing

### Running Tests

```bash
# Backend tests
npm test

# Frontend tests
cd mymoolah-wallet-frontend
npm test

# Integration tests
npm run test:integration
```

### Mojaloop Testing Toolkit

The Testing Toolkit provides:
- API endpoint testing
- Transaction simulation
- Compliance validation
- Performance testing
- Mock DFSP (Digital Financial Service Provider) setup

## 🔒 Security & Compliance

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

### Compliance Standards
- **Mojaloop Compliance** - Following Mojaloop's security standards
- **South African Regulations** - PASA, SARB compliance
- **GDPR** - Data protection compliance
- **PCI DSS** - Payment card industry standards

## 🚀 Deployment

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment

The project is designed for cloud deployment with:
- **Google Cloud Platform** integration
- **Cloud SQL** for database
- **Cloud Storage** for static assets
- **Cloud Run** for containerized services

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/mymoolah-africa/mymoolah-platform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mymoolah-africa/mymoolah-platform/discussions)

## 🙏 Acknowledgments

- **Mojaloop Foundation** - Open-source financial inclusion platform
- **South African Fintech Community** - Industry collaboration
- **Open Source Contributors** - Community-driven development

---

**Building the future of African fintech, one transaction at a time! 🚀**