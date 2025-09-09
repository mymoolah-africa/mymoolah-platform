# MyMoolah Admin Portal (MMAP) System

**Version**: 1.0.0  
**Status**: 🚧 In Development  
**Last Updated**: September 4, 2025  

## 🏗️ **Portal Architecture Overview**

The MyMoolah Admin Portal (MMAP) is a comprehensive multi-role portal system designed to provide specialized interfaces for different entity types within the MyMoolah ecosystem.

### **Portal Structure**
```
/portal/
├── /admin/          # MyMoolah Admin Portal
├── /suppliers/      # Supplier Portal (with dual-role support)
├── /clients/        # Client Portal (B2B)
├── /merchants/      # Merchant Portal
├── /resellers/      # Reseller Portal
├── /shared/         # Shared components and utilities
├── /backend/        # Portal-specific backend services
└── /database/       # Portal database schemas and migrations
```

## 🎯 **Key Features**

### **Dual-Role Support**
- **Suppliers as Merchants**: Entities like Flash and Zapper can operate in both supplier and merchant roles
- **Complex Float Management**: Separate float accounts for different roles with net settlement
- **Unified Dashboard**: Single interface showing both supplier and merchant activities

### **Multi-Portal Architecture**
- **Separate Authentication**: Each portal has its own authentication system
- **Role-Based Access Control**: Granular permissions based on entity type and role
- **Real-time Updates**: WebSocket integration for live data updates
- **Responsive Design**: Mobile-first design for all portals

### **Banking-Grade Security**
- **TLS 1.3**: End-to-end encryption
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **Audit Logging**: Complete audit trail for compliance

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18.20.8+
- PostgreSQL 15.4+
- Redis 7.0+
- MyMoolah Core Platform (running)

### **Installation**
```bash
# Install dependencies
npm install

# Set up environment
cp ../env.template .env
# Edit .env with your configuration

# Run database migrations
npm run migrate

# Start development servers
npm run dev
```

### **Portal URLs**
- **Admin Portal**: http://localhost:3001/admin
- **Supplier Portal**: http://localhost:3002/suppliers
- **Client Portal**: http://localhost:3003/clients
- **Merchant Portal**: http://localhost:3004/merchants
- **Reseller Portal**: http://localhost:3005/resellers

## 📊 **Portal Capabilities**

### **Admin Portal**
- Real-time system monitoring
- Dual-role entity management
- Settlement processing
- Analytics and reporting
- System configuration

### **Supplier Portal**
- Float account management
- Product catalog management
- Transaction monitoring
- Commission tracking
- Dual-role analytics

### **Client Portal**
- Employee management
- Usage analytics
- Float account management
- Service configuration
- Reporting tools

### **Merchant Portal**
- Sales monitoring
- Payment processing
- Commission tracking
- Performance analytics
- Customer management

### **Reseller Portal**
- Client portfolio management
- Performance tracking
- Commission monitoring
- Growth analytics
- Target management

## 🔧 **Development**

### **Available Scripts**
```bash
npm run dev              # Start all portals in development
npm run build            # Build all portals for production
npm run test             # Run all tests
npm run migrate          # Run database migrations
npm run seed             # Seed database with test data
```

### **Portal-Specific Commands**
```bash
npm run dev:admin        # Start admin portal only
npm run dev:suppliers    # Start supplier portal only
npm run build:admin      # Build admin portal only
npm run test:admin       # Test admin portal only
```

## 🏦 **Integration with Core MMTP**

The portal system integrates seamlessly with the existing MyMoolah Treasury Platform:

- **Shared Database**: Uses existing PostgreSQL database with additional portal tables
- **API Integration**: Leverages existing controllers and services
- **Authentication**: Extends existing JWT system with portal-specific tokens
- **Real-time Data**: WebSocket integration with core platform events

## 📈 **Performance & Scalability**

- **Horizontal Scaling**: Each portal can be deployed independently
- **Caching**: Redis-based caching for improved performance
- **Database Optimization**: Optimized queries with proper indexing
- **Load Balancing**: Support for multiple portal instances

## 🔒 **Security & Compliance**

- **Mojaloop Standards**: Full compliance with Mojaloop FSPIOP standards
- **Banking-Grade Security**: ISO 27001 ready security implementation
- **Data Protection**: GDPR-compliant data handling
- **Audit Trail**: Complete transaction and access logging

## 📚 **Documentation**

- [Admin Portal Guide](docs/admin/README.md)
- [Supplier Portal Guide](docs/suppliers/README.md)
- [Client Portal Guide](docs/clients/README.md)
- [Merchant Portal Guide](docs/merchants/README.md)
- [Reseller Portal Guide](docs/resellers/README.md)
- [API Documentation](docs/api/README.md)
- [Deployment Guide](docs/deployment/README.md)

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**MyMoolah Admin Portal System** - Building the future of fintech administration, one portal at a time. 🚀
