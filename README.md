# PantryPal# PantryPal



> **A modern B2B SaaS platform for inventory and billing management**> **A modern B2B SaaS platform for inventory and billing management**



PantryPal is a full-stack web application designed to solve inefficiencies in modern inventory and bill management processes. Built with a focus on multi-tenancy, role-based access control (RBAC), and real-time operations.PantryPal is a full-stack web application designed to solve inefficiencies in modern inventory and bill management processes. Built with a focus on multi-tenancy, role-based access control (RBAC), and real-time operations

    <br />

---    <a href="https://github.com/vansht24/qr-pantry-pro"><strong>Explore the docs »</strong></a>

    <br />

## 📚 Table of Contents    <br />

    <a href="https://github.com/vansht24/qr-pantry-pro">View Demo</a>

- [Tech Stack](#-tech-stack)    &middot;

- [Project Structure](#-project-structure)    <a href="https://github.com/vansht24/qr-pantry-pro/issues/new">Report Bug or Request a Feature</a>

- [Key Features](#-key-features)  </p>

- [Getting Started](#-getting-started)</div>

- [File Reference Guide](#-file-reference-guide)

- [Development Guide](#-development-guide)

- [Authentication & Authorization](#-authentication--authorization)

- [Database Schema](#-database-schema)<!-- TABLE OF CONTENTS -->

- [API Endpoints](#-api-endpoints)<details>

- [Environment Variables](#-environment-variables)  <summary>Table of Contents</summary>

- [Deployment](#-deployment)  <ol>

    <li>

---      <a href="#about-the-project">About The Project</a>

      <ul>

## 🛠 Tech Stack        <li><a href="#built-with">Built With</a></li>

      </ul>

### Frontend    </li>

- **Framework**: React 18.3 with TypeScript    <li>

- **Routing**: React Router DOM v7      <a href="#getting-started">Getting Started</a>

- **State Management**: React Context API + TanStack Query      <ul>

- **UI Components**:         <li><a href="#prerequisites">Prerequisites</a></li>

  - Radix UI primitives (Dialogs, Dropdowns, Popovers, etc.)        <li><a href="#installation">Installation</a></li>

  - ShadCN UI component library      </ul>

  - Tailwind CSS for styling    </li>

- **Forms**: React Hook Form + Zod validation    <li><a href="#usage">Usage</a></li>

- **Icons**: Lucide React    <li><a href="#roadmap">Roadmap</a></li>

- **QR Code**: qr-scanner, qrcode, react-qr-code    <li><a href="#contributing">Contributing</a></li>

- **Charts**: Recharts    <li><a href="#license">License</a></li>

- **Animations**: Framer Motion    <li><a href="#contact">Contact</a></li>

- **Build Tool**: Vite    <li><a href="#acknowledgments">Acknowledgments</a></li>

  </ol>

### Backend</details>

- **Runtime**: Node.js with TypeScript

- **Framework**: Express.js

- **Database**: PostgreSQL (Neon serverless)

- **ORM**: Drizzle ORM<!-- ABOUT THE PROJECT -->

- **Authentication**: ## About The Project

  - Dual system: Session-based (Passport.js) + JWT tokens

  - bcrypt for password hashing[![Product Name Screen Shot][product-screenshot]](https://example.com)

- **Security**: 

  - Helmet.js for HTTP headersHere's a blank template to get started. To avoid retyping too much info, do a search and replace with your text editor for the following: `github_username`, `repo_name`, `twitter_handle`, `linkedin_username`, `email_client`, `email`, `project_title`, `project_description`, `project_license`

  - express-rate-limit for API throttling

  - CORS enabled<p align="right">(<a href="#readme-top">back to top</a>)</p>

- **Session Management**: express-session with connect-pg-simple

- **Email**: Nodemailer (Gmail SMTP support)

- **SMS**: Twilio integration

- **API Documentation**: RESTful architecture### Built With



### Development Tools* [![Next][Next.js]][Next-url]

- **Language**: TypeScript 5.x* [![React][React.js]][React-url]

- **Package Manager**: npm* [![Node][Node.js]][Node-url]

- **Linting**: ESLint + Prettier* [![Express][Express.js]][Express-url]

- **Database Migrations**: Drizzle Kit* [![Tailwindcss][Tailwindcss.com]][Tailwind-url]

- **Testing**: Built-in dev error boundaries* [![Typescript][Typescriptlang.org]][Typescript-url]

* [![Postgresql][postgresql.com]][Postgresql-url]

---

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 📁 Project Structure



```

PantryPal/<!-- GETTING STARTED -->

├── client/                    # Frontend React application## Getting Started

│   ├── public/               # Static assets

│   ├── src/This is an example of how you may give instructions on setting up your project locally.

│   │   ├── components/       # Reusable React componentsTo get a local copy up and running follow these simple example steps.

│   │   │   ├── layout/       # Layout components (Sidebar, Dashboard)

│   │   │   ├── ui/           # ShadCN UI primitives### Prerequisites

│   │   │   ├── OrgIdDisplay.tsx       # Organization ID display widget

│   │   │   └── ProtectedRoute.tsx     # Route protection wrapperThis is an example of how to list things you need to use the software and how to install them.

│   │   ├── contexts/         # React Context providers* npm

│   │   │   ├── AuthContext.tsx        # Session-based auth  ```sh

│   │   │   └── JWTAuthContext.tsx     # JWT-based auth  npm install npm@latest -g

│   │   ├── hooks/            # Custom React hooks  ```

│   │   ├── lib/              # Utility libraries

│   │   │   ├── api.ts        # API client functions### Installation

│   │   │   └── utils.ts      # Helper utilities

│   │   ├── pages/            # Route pages (see below)1. Open terminal at source directory

│   │   ├── App.tsx           # Root component2. Clone the repo

│   │   ├── main.tsx          # Application entry point   ```sh

│   │   └── index.css         # Global styles   git clone https://github.com/vansht24/qr-pantry-pro.git

│   └── index.html            # HTML entry point   ```

│3. Install NPM packages

├── server/                    # Backend Express application   ```sh

│   ├── controllers/          # Request handlers   npm install

│   │   ├── authController.ts         # Auth & invite logic   ```

│   │   └── rbacController.ts         # Role-based access control4. Connect to Postgres db 

│   ├── middleware/           # Express middleware5. Start local server 

│   │   ├── errorHandler.ts          # Global error handling   ```sh

│   │   └── jwtAuth.ts               # JWT authentication   npm run dev

│   ├── services/             # Business logic layer   ```

│   │   ├── authService.ts           # Auth operations

│   │   ├── emailService.ts          # Email sending (Nodemailer)

│   │   └── smsService.ts            # SMS sending (Twilio)<p align="right">(<a href="#readme-top">back to top</a>)</p>

│   ├── scripts/              # Utility scripts

│   │   ├── seed-rbac.ts             # Seed roles & permissions

│   │   ├── seed-test-users.ts       # Create test users

│   │   └── test-invite.ts           # Test invitation flow<!-- USAGE EXAMPLES -->

│   ├── sql/                  # Raw SQL migrations## Usage

│   ├── utils/                # Server utilities

│   │   └── jwt.ts                   # JWT helper functionsUse this space to show useful examples of how a project can be used. Additional screenshots, code examples and demos work well in this space. You may also link to more resources.

│   ├── auth.ts               # Session auth middleware

│   ├── authRoutes.ts         # Session-based auth routes_For more examples, please refer to the [Documentation](https://example.com)_

│   ├── db.ts                 # Database connection

│   ├── index.ts              # Express server entry point<p align="right">(<a href="#readme-top">back to top</a>)</p>

│   ├── routes.jwt.ts         # JWT-protected routes

│   ├── routes.ts             # Main API routes

│   ├── storage.ts            # Data access layer

│   └── vite.ts               # Vite dev server integration<!-- ROADMAP -->

│## Roadmap

├── shared/                    # Shared code (client + server)

│   └── schema.ts             # Drizzle ORM schema definitions- [ ] Categorical sorting of products

│- [ ] System Architechture

├── .env                       # Environment variables (gitignored)- [ ] Migration to Firebase 

├── .env.email-sms            # Email/SMS config template- [ ] Multiple user profiles having different autherisations

├── components.json           # ShadCN config    - [ ] Nested Feature

├── drizzle.config.ts         # Drizzle ORM configuration

├── package.json              # Dependencies & scriptsSee the [open issues](https://github.com/vansht24/qr-pantry-pro/issues) for a full list of proposed features (and known issues).

├── tailwind.config.ts        # Tailwind CSS configuration

├── tsconfig.json             # TypeScript configuration<p align="right">(<a href="#readme-top">back to top</a>)</p>

└── vite.config.ts            # Vite build configuration

```



---<!-- CONTRIBUTING -->

## Contributing

## ✨ Key Features

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

### 1. **Multi-Tenant Architecture**

- Organization-based isolationIf you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".

- Users can belong to multiple organizationsDon't forget to give the project a star! Thanks again!

- Store-level segregation within organizations

1. Fork the Project

### 2. **Role-Based Access Control (RBAC)**2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)

- **Roles**: Admin, Store Manager, Inventory Manager, Cashier3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)

- **Permissions**: Granular control over resources4. Push to the Branch (`git push origin feature/AmazingFeature`)

- **Dynamic Role Assignment**: Via invitations or manual assignment5. Open a Pull Request



### 3. **Dual Authentication System**<p align="right">(<a href="#readme-top">back to top</a>)</p>

- **Session-based**: Traditional login for web app

- **JWT tokens**: For API integrations and mobile apps### Top contributors:

- **Refresh tokens**: Secure, long-lived authentication

<a href="https://github.com/vansht24/qr-pantry-pro/graphs/contributors">

### 4. **Invitation System**  <img src="https://contrib.rocks/image?repo=github_username/repo_name" alt="contrib.rocks image" />

- Send invites via Email + SMS</a>

- Role pre-selection by inviter

- 5-second confirmation delay

- Secure token-based acceptance

<!-- LICENSE -->

### 5. **Inventory Management**## License

- Product catalog with QR/Barcode support

- Stock level tracking with alertsDistributed under the project_license. See `LICENSE.txt` for more information.

- Expiry date monitoring

- Category-based organization<p align="right">(<a href="#readme-top">back to top</a>)</p>

- Search, filter, and sort capabilities



### 6. **Billing System**

- Customer management<!-- CONTACT -->

- Invoice generation## Contact

- Sales tracking

- Revenue analyticsYour Name - [@twitter_handle](https://twitter.com/twitter_handle) - email@email_client.com



### 7. **Dashboard & Analytics**Project Link: [https://github.com/github_username/repo_name](https://github.com/github_username/repo_name)

- Real-time statistics

- Low stock alerts<p align="right">(<a href="#readme-top">back to top</a>)</p>

- Expiring products notifications

- Sales trends



---<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

## 🚀 Getting Started

* []()

### Prerequisites* []()

- Node.js 18+ and npm* []()

- PostgreSQL database (or Neon serverless account)

- Gmail account (for email invites)<p align="right">(<a href="#readme-top">back to top</a>)</p>

- Twilio account (optional, for SMS)



### Installation

<!-- MARKDOWN LINKS & IMAGES -->

```bash<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

# Clone the repository[contributors-shield]: https://img.shields.io/github/contributors/github_username/repo_name.svg?style=for-the-badge

git clone https://github.com/Creat1ve-shubh/PantryPal.git[contributors-url]: https://github.com/github_username/repo_name/graphs/contributors

cd PantryPal[forks-shield]: https://img.shields.io/github/forks/github_username/repo_name.svg?style=for-the-badge

[forks-url]: https://github.com/github_username/repo_name/network/members

# Install dependencies[stars-shield]: https://img.shields.io/github/stars/github_username/repo_name.svg?style=for-the-badge

npm install[stars-url]: https://github.com/github_username/repo_name/stargazers

[issues-shield]: https://img.shields.io/github/issues/github_username/repo_name.svg?style=for-the-badge

# Set up environment variables[issues-url]: https://github.com/github_username/repo_name/issues

cp .env.example .env[license-shield]: https://img.shields.io/github/license/github_username/repo_name.svg?style=for-the-badge

# Edit .env with your database credentials[license-url]: https://github.com/github_username/repo_name/blob/master/LICENSE.txt

[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555

# Push database schema[linkedin-url]: https://linkedin.com/in/linkedin_username

npm run db:push[product-screenshot]: images/screenshot.png

<!-- Shields.io badges. You can a comprehensive list with many more badges at: https://github.com/inttter/md-badges -->

# Seed RBAC roles and permissions[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white

npx tsx server/scripts/seed-rbac.ts[Next-url]: https://nextjs.org/

[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB

# Seed test users (optional)[React-url]: https://reactjs.org/

npx tsx server/scripts/seed-test-users.ts[Node.js]: https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white

[Node-url]: https://nodejs.org/en

# Start development server[Tailwindcss.com]: https://img.shields.io/badge/Tailwind_CSS-grey?style=for-the-badge&logo=tailwind-css&logoColor=38B2AC

npm run dev[Tailwind-url]: https://tailwindcss.com/

```[postgresql.com]: https://img.shields.io/badge/postgresql-4169e1?style=for-the-badge&logo=postgresql&logoColor=white

[postgresql-url]: https://www.postgresql.org/ 

The app will be available at `http://localhost:5000`[Typescriptlang.org]: https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square

[Typescript-url]: https://www.typescriptlang.org/

### Test Credentials[Express.js]: https://img.shields.io/badge/express.js-000000?style=for-the-badge&logo=express&logoColor=white

After running `seed-test-users.ts`:[Express-url]: https://expressjs.com/

- **Admin**: admin1@example.com / Passw0rd!
- **Store Manager**: storemgr1@example.com / Passw0rd!
- **Inventory Manager**: invmgr1@example.com / Passw0rd!
- **Cashier**: cashier1@example.com / Passw0rd!

---

## 📖 File Reference Guide

### When to Modify What

#### 🎨 **Adding/Modifying UI Components**
| Task | Files to Edit |
|------|---------------|
| Create new page | `client/src/pages/YourPage.tsx` + update routing in `client/src/App.tsx` |
| Add reusable component | `client/src/components/YourComponent.tsx` |
| Modify dashboard | `client/src/pages/Dashboard.tsx` |
| Update sidebar/layout | `client/src/components/layout/AppSidebar.tsx`, `DashboardLayout.tsx` |
| Add ShadCN component | Run `npx shadcn-ui@latest add <component>` |
| Customize theme/styles | `client/src/index.css`, `tailwind.config.ts` |

#### 🔐 **Authentication & Authorization**
| Task | Files to Edit |
|------|---------------|
| Modify login flow | `server/authRoutes.ts`, `client/src/pages/Login.tsx` |
| Add new role | `server/scripts/seed-rbac.ts` (re-run to apply) |
| Change permissions | `shared/schema.ts` (roles table), `server/scripts/seed-rbac.ts` |
| Update JWT logic | `server/utils/jwt.ts`, `server/middleware/jwtAuth.ts` |
| Session management | `server/auth.ts`, `server/index.ts` (session config) |
| Invitation system | `server/controllers/authController.ts` (orgInvite function) |

#### 🗄️ **Database & API**
| Task | Files to Edit |
|------|---------------|
| Add database table | `shared/schema.ts` + run `npm run db:push` |
| Create API endpoint | `server/routes.ts` (session-based) or `server/routes.jwt.ts` (JWT) |
| Add business logic | `server/services/yourService.ts` |
| Modify data access | `server/storage.ts` |
| Create controller | `server/controllers/yourController.ts` |

#### 📧 **Email & SMS**
| Task | Files to Edit |
|------|---------------|
| Email templates | `server/services/emailService.ts` |
| SMS templates | `server/services/smsService.ts` |
| Configure providers | `.env` (SMTP and Twilio credentials) |

#### 🧩 **Core Features**
| Task | Files to Edit |
|------|---------------|
| Inventory operations | `server/storage.ts`, `client/src/pages/Inventory.tsx` |
| Product management | `client/src/pages/AddProduct.tsx`, `server/routes.ts` |
| Billing system | `client/src/pages/NewBill.tsx`, `Billing.tsx` |
| User management | `client/src/pages/UserManagement.tsx` |
| QR scanning | `client/src/pages/QRScanner.tsx` |
| Reports/analytics | `client/src/pages/Reports.tsx`, `Dashboard.tsx` |

---

## 🔧 Development Guide

### Available Scripts

```bash
# Development
npm run dev              # Start dev server (frontend + backend)

# Production
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:push          # Push schema changes to database

# Type checking
npm run check            # Run TypeScript compiler checks
```

### Adding a New Page

1. **Create the page component**:
   ```tsx
   // client/src/pages/MyNewPage.tsx
   export default function MyNewPage() {
     return <div>My New Page</div>;
   }
   ```

2. **Add route in App.tsx**:
   ```tsx
   import MyNewPage from './pages/MyNewPage';
   
   // Inside your Routes component
   <Route path="/my-new-page" element={<MyNewPage />} />
   ```

3. **Add sidebar link** (if needed):
   ```tsx
   // client/src/components/layout/AppSidebar.tsx
   {
     title: "My New Page",
     url: "/my-new-page",
     icon: YourIcon,
   }
   ```

### Adding a New API Endpoint

1. **Define in routes**:
   ```typescript
   // server/routes.ts
   app.get("/api/my-endpoint", isAuthenticated, async (req, res) => {
     try {
       const data = await storage.getMyData();
       res.json(data);
     } catch (error) {
       res.status(500).json({ error: "Failed to fetch data" });
     }
   });
   ```

2. **Add storage method** (if needed):
   ```typescript
   // server/storage.ts
   async getMyData() {
     return await this.db.select().from(myTable);
   }
   ```

3. **Call from frontend**:
   ```typescript
   // client/src/lib/api.ts
   export async function getMyData() {
     const response = await fetch('/api/my-endpoint');
     if (!response.ok) throw new Error('Failed to fetch');
     return response.json();
   }
   ```

### Database Schema Changes

1. **Update schema**:
   ```typescript
   // shared/schema.ts
   export const myNewTable = pgTable("my_new_table", {
     id: serial("id").primaryKey(),
     name: text("name").notNull(),
     // ... other fields
   });
   ```

2. **Push changes**:
   ```bash
   npm run db:push
   ```

3. **Update TypeScript types** (auto-generated by Drizzle):
   ```typescript
   export type MyNewTable = typeof myNewTable.$inferSelect;
   ```

---

## 🔐 Authentication & Authorization

### Session-Based Auth (Primary)
- Used for web application login
- Managed by Passport.js + express-session
- Sessions stored in PostgreSQL via connect-pg-simple
- Cookie-based authentication

**Files**:
- `server/auth.ts` - Session middleware
- `server/authRoutes.ts` - Login/logout/register endpoints
- `client/src/contexts/AuthContext.tsx` - Frontend auth state

### JWT Auth (API/Integrations)
- Used for API integrations and invitation system
- Supports access + refresh tokens
- Access token: 15 minutes expiry
- Refresh token: 7 days expiry

**Files**:
- `server/routes.jwt.ts` - JWT-protected endpoints
- `server/middleware/jwtAuth.ts` - JWT verification
- `server/utils/jwt.ts` - Token generation/validation
- `client/src/contexts/JWTAuthContext.tsx` - Frontend JWT state

### RBAC System

**Roles** (in order of permissions):
1. **Admin** - Full system access
   - Can invite: Store Managers, Inventory Managers, Cashiers
2. **Store Manager** - Store-level operations
   - Can invite: Inventory Managers, Cashiers
3. **Inventory Manager** - Product management
4. **Cashier** - Sales and billing only

**Files**:
- `shared/schema.ts` - Roles, permissions, user_roles tables
- `server/scripts/seed-rbac.ts` - Role definitions
- `server/controllers/rbacController.ts` - Role filtering logic

---

## 🗃 Database Schema

### Core Tables

#### `users`
- User accounts
- Fields: id, username, email, password, role, full_name, phone, is_active

#### `organizations`
- Multi-tenant organizations
- Fields: id, name, created_at

#### `stores`
- Physical stores within organizations
- Fields: id, org_id, name, location, manager_id

#### `roles`
- RBAC role definitions
- Fields: id, name, description, created_at

#### `permissions`
- Granular permissions
- Fields: id, name, description, resource, action

#### `role_permissions`
- Maps roles to permissions
- Fields: role_id, permission_id

#### `user_roles`
- Assigns users to orgs/stores with roles
- Fields: id, user_id, org_id, store_id, role_id

#### `user_invites`
- Invitation tokens
- Fields: id, org_id, email, full_name, phone, role_id, token_hash, expires_at, accepted_at

#### `products`
- Inventory items
- Fields: id, name, category, brand, barcode, qr_code, mrp, buying_cost, manufacturing_date, expiry_date, quantity_in_stock, min_stock_level

#### `customers`
- Customer records
- Fields: id, name, email, phone, address

#### `bills`
- Sales invoices
- Fields: id, bill_number, customer_id, items (JSONB), total_amount, discount, final_amount, payment_method

#### `audit_logs`
- Activity tracking
- Fields: id, user_id, org_id, action, details, ip_address, timestamp

---

## 🌐 API Endpoints

### Authentication (Session)
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login
POST   /api/auth/logout        Logout
GET    /api/auth/me            Get current user
GET    /api/org/current        Get user's current org ID
```

### Authentication (JWT)
```
POST   /auth/login             Login (returns access + refresh tokens)
POST   /auth/refresh           Refresh access token
POST   /auth/logout            Invalidate refresh token
```

### Organizations & Invitations
```
POST   /org/invite             Send invitation (admin/store_manager)
POST   /org/invite/accept      Accept invitation
GET    /rbac/roles             Get assignable roles (filtered by user role)
```

### Products
```
GET    /api/products           List all products
GET    /api/products/:id       Get single product
POST   /api/products           Create product (admin/store_manager)
PUT    /api/products/:id       Update product (admin/store_manager)
DELETE /api/products/:id       Delete product (admin)
```

### Customers
```
GET    /api/customers          List customers
POST   /api/customers          Create customer
PUT    /api/customers/:id      Update customer
DELETE /api/customers/:id      Delete customer
```

### Billing
```
GET    /api/bills              List bills
POST   /api/bills              Create bill
GET    /api/bills/:id          Get bill details
```

### Dashboard
```
GET    /api/dashboard/stats    Get dashboard statistics
```

### User Management
```
GET    /api/auth/users         List users (admin/store_manager)
POST   /api/auth/users         Create user (admin)
PUT    /api/auth/users/:id     Update user (admin)
DELETE /api/auth/users/:id     Deactivate user (admin)
```

---

## 🌍 Environment Variables

Create a `.env` file in the project root:

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Session Secret (Required)
SESSION_SECRET=your-strong-random-secret-here

# JWT Secrets (Required for JWT auth)
JWT_ACCESS_SECRET=your-jwt-access-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret

# Application
PORT=5000
HOST=127.0.0.1
NODE_ENV=development
APP_BASE_URL=http://localhost:5000

# Email (Nodemailer - Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Getting Email/SMS Credentials

**Gmail App Password**:
1. Enable 2FA on your Google account
2. Visit https://myaccount.google.com/apppasswords
3. Generate an app password
4. Use this as `SMTP_PASS`

**Twilio**:
1. Sign up at https://www.twilio.com
2. Get your Account SID and Auth Token from the dashboard
3. Purchase a phone number

---

## 🚢 Deployment

### Production Build

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set strong session and JWT secrets
4. Configure email/SMS providers
5. Set up HTTPS (recommended)

### Recommended Platforms

- **Vercel** / **Netlify** - Frontend static hosting
- **Railway** / **Render** / **Heroku** - Full-stack deployment
- **Neon** / **Supabase** - PostgreSQL hosting
- **DigitalOcean** / **AWS** - Self-hosted

---

## 📚 Additional Documentation

All detailed guides are available in the [`docs/`](./docs) folder:

### Setup & Configuration
- [`docs/QUICKSTART.md`](./docs/QUICKSTART.md) - Quick start guide
- [`docs/AUTH_SETUP_GUIDE.md`](./docs/AUTH_SETUP_GUIDE.md) - Detailed authentication setup
- [`docs/QUICK_START_AUTH.md`](./docs/QUICK_START_AUTH.md) - Quick auth configuration
- [`docs/NEON_MIGRATION.md`](./docs/NEON_MIGRATION.md) - Database migration guide

### Authentication & Security
- [`docs/MULTI_AUTH_SUMMARY.md`](./docs/MULTI_AUTH_SUMMARY.md) - Dual auth system explanation
- [`docs/AUTH_JWT_README.md`](./docs/AUTH_JWT_README.md) - JWT implementation details
- [`docs/SECURITY_COMPLETE.md`](./docs/SECURITY_COMPLETE.md) - Complete security guide
- [`docs/SECURITY_SUMMARY.md`](./docs/SECURITY_SUMMARY.md) - Security summary

### Features & Implementation
- [`docs/REGISTRATION_FEATURE.md`](./docs/REGISTRATION_FEATURE.md) - User registration flow
- [`docs/ROLE_MIGRATION.md`](./docs/ROLE_MIGRATION.md) - RBAC role changes
- [`docs/IMPLEMENTATION_COMPLETE.md`](./docs/IMPLEMENTATION_COMPLETE.md) - Complete implementation guide
- [`docs/IMPLEMENTATION_SUMMARY.md`](./docs/IMPLEMENTATION_SUMMARY.md) - Implementation summary

### Docker & Testing
- [`docs/DOCKER_TESTING_GUIDE.md`](./docs/DOCKER_TESTING_GUIDE.md) - Containerization & testing guide

### Configuration Templates
- `.env.email-sms` - Email/SMS configuration template
- `.env.docker` - Docker environment template

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- [ShadCN UI](https://ui.shadcn.com/) for beautiful components
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database access
- [Neon](https://neon.tech/) for serverless PostgreSQL
- All open-source contributors

---

## 📞 Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/Creat1ve-shubh/PantryPal/issues) page.

---

**Built with ❤️ by the PantryPal Team**
