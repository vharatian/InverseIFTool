# JSON Prompt Application

A full-stack application with React frontend and NestJS backend for processing JSON criteria with AI prompts, using Turborepo for optimal monorepo management.

## Project Structure

```
├── frontend/          # React + Vite frontend (port 3000)
├── backend/           # NestJS backend (port 3002)
├── turbo.json         # Turborepo configuration
├── package.json       # Root monorepo configuration
└── README.md          # This documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Yarn package manager

### Installation & Setup

```bash
# Clone and install dependencies
git clone <repository-url>
cd json-prompt-app
yarn install

# Seed the database with admin user
yarn seed

# Start both frontend and backend in development mode
yarn dev
```

The application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3002

## ✨ Features

### Frontend (React + Vite)

- **JSON Array Validation**: Real-time validation of JSON criteria arrays
- **LLM Integration**: Direct OpenAI API calls for prompt processing
- **Backend Integration**: Fetches LLM provider configuration from backend
- **Authentication UI**: Examples of auth integration with backend
- **Responsive UI**: CoreUI components for modern interface

### Backend (NestJS)

- **Authentication System**: JWT-based auth with local and OAuth strategies
- **User Management**: Full CRUD operations with SQLite database
- **LLM Configuration**: Manage multiple LLM provider configurations
- **Google OAuth**: Social login integration (optional)
- **TypeORM + SQLite**: Robust database layer with auto-synchronization
- **Passport.js**: Local and JWT strategies for authentication
- **bcrypt**: Password hashing for security
- **CORS Support**: Cross-origin requests from frontend
- **RESTful API**: Clean, documented API endpoints
- **TypeScript**: Full type safety

## 🛠️ Development Commands

### Monorepo Commands (Recommended)

```bash
# Start both services in development mode
yarn dev

# Build both services for production
yarn build

# Start both services in production mode
yarn start

# Run linting across all workspaces
yarn lint

# Run tests across all workspaces
yarn test

# Clean all node_modules and build artifacts
yarn clean
```

### Individual Service Commands

**Frontend:**

```bash
cd frontend
yarn dev          # Development server
yarn build        # Production build
yarn start        # Preview production build
yarn lint         # Run ESLint
```

**Backend:**

```bash
cd backend
yarn dev          # Development with hot reload
yarn build        # TypeScript compilation
yarn start        # Production server
yarn seed         # Seed database with admin user
yarn test         # Run tests
yarn lint         # Run ESLint
```

## 🔧 Environment Configuration

### Database & Authentication

- **Database**: SQLite with TypeORM
- **Location**: `backend/database.sqlite`
- **Schema**: Auto-synchronized in development
- **Authentication**: JWT tokens with Passport.js
- **Password Hashing**: bcrypt with salt rounds
- **OAuth**: Google OAuth2 (optional)
- **Admin User**: Manual seeding required
- **Authorization**: Role-based access control

#### Database Entities

- **User**: id, email, name, password, googleId, avatar, emailVerified, timestamps
- **LLMProviderConfig**: id, name, provider, apiKey, models, defaultModel, isActive, timestamps

### Frontend (.dev.env)

```env
# Backend API Configuration
VITE_API_BASE_URL=http://localhost:3002

# OpenAI API Configuration (for client-side LLM calls)
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
```

### Backend (.env)

```env
# Server Configuration
PORT=3002
FRONTEND_URL=http://localhost:3000

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin User (created when running yarn seed)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3002/auth/google/callback

# Optional: OpenAI API Key for server-side operations
OPENAI_API_KEY=your_openai_api_key_here
```

## 📡 API Endpoints

### Authentication

```
POST   /auth/login         # Local login (email/password)
POST   /auth/register      # Register new user
GET    /auth/google        # Initiate Google OAuth
GET    /auth/google/callback # Google OAuth callback
GET    /auth/profile       # Get user profile (JWT required)
```

### Users Management

```
GET    /users              # Get all users
GET    /users/:id          # Get user by ID
POST   /users              # Create new user
PUT    /users/:id          # Update user
DELETE /users/:id          # Delete user
```

### LLM Configuration

```
GET    /config             # Get all configurations
GET    /config/active      # Get active configuration
GET    /config/:id         # Get configuration by ID
POST   /config             # Create new configuration
PUT    /config/:id         # Update configuration
PUT    /config/:id/activate # Activate configuration
DELETE /config/:id         # Delete configuration
```

GET /users # Get all users
GET /users/:id # Get user by ID
POST /users # Create new user
PUT /users/:id # Update user
DELETE /users/:id # Delete user

```

### LLM Configuration

```

GET /config # Get all configurations
GET /config/active # Get active configuration
GET /config/:id # Get configuration by ID
POST /config # Create new configuration
PUT /config/:id # Update configuration
PUT /config/:id/activate # Activate configuration
DELETE /config/:id # Delete configuration

````

## 🏗️ Architecture Decisions

### Turborepo Benefits

- **Build Caching**: Only rebuilds what changed
- **Task Orchestration**: Run tasks across workspaces efficiently
- **Remote Caching**: Share build cache across team/CI
- **Pipeline Management**: Define task dependencies

### Client-side LLM Calls

- **Performance**: Direct API calls reduce latency
- **Configuration**: Backend provides configuration, frontend executes
- **Security**: API keys managed per user/client

### Monorepo Structure

- **Shared Code**: Easy to share utilities between services
- **Atomic Changes**: Update both services in single commit
- **Consistent Tooling**: Same linting, testing, and build tools

## 🔍 Development Workflow

1. **Make changes** in either frontend or backend
2. **Turborepo automatically** rebuilds only affected parts
3. **Hot reload** works for both services simultaneously
4. **Shared cache** speeds up subsequent builds

## 🔐 Authentication Setup

### Database Seeding
Before using the application, you need to seed the database with an admin user:

```bash
# Seed the database with admin user
yarn seed

# Admin credentials (from .env):
# Email: admin@example.com
# Password: admin123
```

### Local Authentication
- **Register**: `POST /auth/register` with email, name, password
- **Login**: `POST /auth/login` with email, password
- **Profile**: `GET /auth/profile` (requires JWT token)

### Google OAuth (Optional)
1. Create OAuth app at [Google Cloud Console](https://console.cloud.google.com/)
2. Add credentials to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:3002/auth/google/callback
   ```
3. Use `GET /auth/google` to initiate login

### JWT Tokens
- Include `Authorization: Bearer <token>` header for protected routes
- Tokens expire in 24 hours (configurable)

## 🚀 Deployment

### Production Build
```bash
# Build both services
yarn build

# Start production servers
yarn start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure proper database (PostgreSQL/MySQL recommended)
- Set up OAuth credentials
- Disable `synchronize: true` in TypeORM config

## 📝 Contributing

1. **Install dependencies**: `yarn install`
2. **Start development**: `yarn dev`
3. **Make changes** in respective workspaces
4. **Test thoroughly** before committing
5. **Use conventional commits** for better changelog generation

## 🔐 Security Notes

- API keys are environment variables, never committed
- CORS configured for frontend-backend communication
- Input validation on both frontend and backend
- LLM calls happen client-side for user privacy

---

**Built with**: React, NestJS, TypeScript, Turborepo, Vite, OpenAI API
````
