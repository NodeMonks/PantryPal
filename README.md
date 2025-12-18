# 🥘 PantryPal

A comprehensive inventory management system for pantry and product tracking with expiry alerts, billing, and multi-user support.

## 📋 Overview

PantryPal is a full-stack web application designed to help manage pantry inventory, track product expiration dates, generate bills, and manage multiple organizations with role-based access control.

## ✅ Production Status

**Last Updated:** December 18, 2025  
**Branch:** testing  
**Status:** ✅ **PRODUCTION READY**

- ✅ All tests passing (89 passed, 27 skipped, 0 failed)
- ✅ Transaction support implemented (Neon serverless Pool)
- ✅ Bill immutability enforced
- ✅ Stock conservation with atomic operations
- ✅ Multi-tenant isolation verified
- ✅ QR code storage feature complete

## ✨ Features

- 📦 **Inventory Management** - Track products with quantities, expiry dates, and categories
- 🔔 **Expiry Alerts** - Automatic notifications for products nearing expiration
- 💳 **Billing System** - Generate and manage customer bills with immutability guarantees
- 👥 **Multi-User Support** - Role-based access control (Admin, Store Manager, Inventory Manager, Cashier)
- 🏢 **Organization Management** - Multi-tenant architecture with strict tenant isolation
- 📱 **QR Code Generation & Storage** - Generate, store, and print QR codes for products
- 📊 **Reports & Analytics** - Comprehensive reporting dashboard
- 🔐 **Secure Authentication** - JWT-based auth with session management
- ⚡ **Transaction Safety** - Atomic bill finalization with automatic rollback
- 🐳 **Docker Support** - Containerized deployment for easy setup

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Creat1ve-shubh/PantryPal.git
   cd PantryPal
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and configure your settings:

   ```bash
   cp .env.example .env
   ```

   **📖 For detailed environment configuration, see [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)**

4. **Set up the database**

   ```bash
   npm run db:push
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open http://localhost:5000
   - Default admin credentials will be created on first run

## 🐳 Docker Deployment

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up
```

For detailed Docker setup, see [docs/DOCKER_TESTING_GUIDE.md](./docs/DOCKER_TESTING_GUIDE.md)

## 📚 Documentation

Comprehensive documentation is available in the [docs](./docs) folder:

### Getting Started

- [Quick Start Guide](./docs/QUICKSTART.md) - Get up and running quickly
- [Environment Configuration](./docs/ENVIRONMENT.md) - **Complete environment variable setup**
- [Quick Auth Setup](./docs/QUICK_START_AUTH.md) - Authentication quick start

### Core Features

- [Authentication Setup](./docs/AUTH_SETUP_GUIDE.md) - Complete authentication guide
- [Security Implementation](./docs/SECURITY_COMPLETE.md) - Security features and best practices
- [User Management & RBAC](./docs/ROLE_MIGRATION.md) - Role-based access control

### Deployment & Operations

- [Docker & Testing](./docs/DOCKER_TESTING_GUIDE.md) - Container setup and testing
- [Database Migration](./docs/NEON_MIGRATION.md) - PostgreSQL/Neon setup

### Architecture

- [Multi-Auth System](./docs/MULTI_AUTH_SUMMARY.md) - Dual authentication overview
- [Implementation Summary](./docs/IMPLEMENTATION_SUMMARY.md) - Complete implementation details

## 🛠️ Technology Stack

**Frontend:**

- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Shadcn/ui components
- React Router for navigation

**Backend:**

- Node.js with Express
- PostgreSQL database
- Drizzle ORM
- JWT authentication
- bcryptjs for password hashing

**DevOps:**

- Docker & Docker Compose
- Vitest for unit testing
- Playwright for e2e testing

## 📁 Project Structure

```
PantryPal/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   └── lib/          # Utilities
├── server/               # Express backend
│   ├── controllers/      # Route controllers
│   ├── middleware/       # Auth & other middleware
│   ├── services/         # Business logic
│   └── config/           # Configuration
├── shared/               # Shared types & schemas
├── docs/                 # Documentation
└── tests/                # Test suites
```

## 🔐 Environment Variables

All environment variables are now stored in `.env` file at the root of the project.

**📖 For complete environment variable documentation and configuration guide, see:**

- **[docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)** - Complete environment configuration guide

Key variables include:

- Database connection (PostgreSQL/Neon)
- JWT secrets and session configuration
- Email/SMS service credentials (optional)
- Application settings

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Run all tests
npm run test:all
```

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 License

This project is licensed under the MIT License.

## 🔗 Links

- [GitHub Repository](https://github.com/Creat1ve-shubh/PantryPal)
- [Issue Tracker](https://github.com/Creat1ve-shubh/PantryPal/issues)
- [Discussions](https://github.com/Creat1ve-shubh/PantryPal/discussions)

## 📧 Support

For questions or support:

- Open an issue on GitHub
- Check the [documentation](./docs)
- Join the discussions

---

**Last Updated**: November 21, 2025
