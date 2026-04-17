# Trip Planner

An AI-powered travel planning platform focused on Uttarakhand, built with a modern React frontend and Node.js backend. The project helps users generate and manage itineraries, visualize routes, and personalize trips with map-based and LLM-assisted features.

## Project Name

Trip Planner

## Project Overview

Trip Planner is designed to simplify travel planning by combining:
- Intelligent itinerary generation
- Route planning and map visualization
- User authentication and profile management
- Saved trip management

The system integrates geolocation-based route logic with AI-assisted planning workflows.

## Team Members

- Karan Bhatt (Team Leader)
- Aman Singh Rawat
- Adrita Maithi

## Project Roles

- Karan Bhatt: Research, Frontend-Backend Integration
- Aman Singh Rawat: Backend and RAG Pipeline
- Adrita Maithi: Frontend, Reports, and Research Papers

## Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- React Router
- Firebase Authentication (Google, Phone OTP)
- Leaflet + React Leaflet
- Leaflet Routing Machine

### Backend

- Node.js
- Express.js
- MongoDB + Mongoose
- Firebase Admin SDK
- JWT Authentication
- express-rate-limit
- CORS

### AI / LLM Layer

- LangChain Core
- Groq LLM integration for chatbot/itinerary features

## Project Sources / External Services

- Leaflet for mini map and route visualization
- Geolocation services for spatial and route-related features
- Groq LLM for backend AI responses
- Firebase for authentication and identity token verification

## Key Features

- Google and Phone OTP login
- Protected dashboard and profile management
- Edit profile (name, email, phone, photo upload)
- Delete account functionality
- Trip creation, update, retrieval, and deletion
- Route planning with map integration
- AI-assisted itinerary/chat pipeline

## Folder Structure

```text
Trip-Planner/
  README.md
  IMPLEMENTATION_CHECKLIST.md
  QUICK_START.md
  README_ROUTE_FEATURE.md
  ROUTE_FEATURE_GUIDE.md
  ROUTE_INTEGRATION_GUIDE.js

  backend/
    index.js
    firebaseAdmin.js
    firebaseAdminKey.json
    package.json
    Routes/
      auth.js
      user.routes.js
      trip.routes.js
      chatbot.routes.js
      route.js
    controllers/
      auth.controller.js
      user.controller.js
      trip.controller.js
      bot.controller.js
    middleware/
      authMiddleware.js
    models/
      user.model.js
      trip.model.js
      message.model.js
    services/
      auth.service.js
      routeService.js
    chatbot/
      prompt_generator.js
    tests/
      routeTests.js

  FrontEnd/
    package.json
    vite.config.js
    index.html
    src/
      App.jsx
      main.jsx
      firebase.js
      components/
      context/
      pages/
      services/
      utils/
```

## Architecture Summary

- Frontend communicates with backend REST APIs under `/api/*`.
- Backend verifies Firebase ID tokens and issues short session JWTs.
- Protected routes use JWT middleware.
- MongoDB stores users and trip records.
- Route and itinerary modules provide planning and visualization support.

## API Highlights

- `POST /api/auth/verify` - Verify Firebase token and create session
- `GET /api/auth/profile` - Fetch user profile
- `PUT /api/auth/profile` - Update profile fields
- `DELETE /api/auth/account` - Delete account and user trips
- `POST /api/auth/logout` - Stateless logout endpoint
- Trip APIs under `/api/v1/trip/*`
- Chatbot APIs under `/api/v1/chatbot/*`
- Route APIs under `/api/route` (and related route endpoints)

## Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB instance
- Firebase project credentials
- Groq API access (for LLM features)

## Environment Variables

### Backend

Create `backend/.env` with required keys, for example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

Add Firebase Admin credentials and any LLM-related keys used by your chatbot/AI services.

### Frontend

Create `FrontEnd/.env` and configure Firebase + backend URL:

```env
VITE_FIREBASEAPI=...
VITE_AUTHDOMAIN=...
VITE_PROJECTID=...
VITE_STORAGEBUCKET=...
VITE_MESSAGINGSENDERID=...
VITE_APPID=...
VITE_MEASUREMENTID=...
VITE_BACKEND_URL=http://localhost:5000
```

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install

cd ../FrontEnd
npm install
```

### 2. Start backend

```bash
cd backend
npm run dev
```

### 3. Start frontend

```bash
cd FrontEnd
npm run dev
```

### 4. Open app

Visit the local frontend URL printed by Vite (typically `http://localhost:5173`).

## Testing and Linting

### Backend tests

```bash
cd backend
npm test
```

### Frontend lint

```bash
cd FrontEnd
npm run lint
```

## Current Scope and Notes

- Focused on Uttarakhand trip workflows.
- Includes route visualization and map interactions.
- Authentication and profile systems are integrated with Firebase and backend JWT sessions.
- AI workflow uses Groq through backend service abstraction.

## Future Improvements

- Cloud image storage (instead of base64 profile image payloads)
- More advanced RAG document ingestion and retrieval controls
- Better analytics and recommendation personalization
- Production deployment guide for frontend/backend split hosting

## Contributors

- Karan Bhatt
- Aman Singh Rawat
- Adrita Maithi
