# Marlion Winter Internship 2025 - Monorepo

A production-ready fullstack application for managing the Marlion Technologies Winter Internship 2025 program.

## 🏗️ Architecture

```
marlion-winter25/
├── apps/
│   ├── student/        # Next.js 15 Student PWA
│   └── admin/          # Next.js 15 Admin Dashboard
├── packages/
│   ├── ui/             # Shared UI components (React + Tailwind)
│   ├── lib/            # AI utilities, Firestore helpers, validators
│   └── config/         # Firebase client & admin configuration
├── firebase/           # Firestore & Storage rules
└── .github/workflows/  # CI/CD pipelines
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 10+
- Firebase Project
- DigitalOcean Gradient AI API Key (Llama 3.3 70B)

### Installation

```bash
# Clone the repository
git clone https://github.com/marlion-tech/marlion-winter25.git
cd marlion-winter25

# Install dependencies
npm install

# Set up environment variables
cp apps/student/.env.local.example apps/student/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# Edit both files with your credentials
```

### Development

```bash
# Run all apps
npm run dev

# Run specific app
npm run dev:student  # Student PWA on port 3000
npm run dev:admin    # Admin dashboard on port 3001
```

### Building

```bash
# Build all apps
npm run build

# Build specific app
npm run build:student
npm run build:admin
```

## 📱 Student PWA Features

1. **Home Page** - Hero, streams overview, countdown, CEO message, AI chat
2. **Registration** - Google/Email/Phone auth, multi-step form
3. **AI Interview** - 5-minute conversational interview with evaluation
4. **Offer Letter** - Terms acceptance, PDF download
5. **Bootcamp** - Video lessons, AI Q&A, quizzes, anti-cheat detection
6. **Project Tracker** - Kanban board, daily logs, milestones
7. **Help Center** - AI support, ticket system
8. **Certificate** - QR-verifiable completion certificate

## 🛡️ Admin Dashboard Features

1. **Dashboard** - Stats overview, quick actions
2. **Student Management** - List, filter, search, accept/reject/ban
3. **Course CMS** - Create modules, upload videos, AI summaries
4. **Project Management** - Problem statements, assignments
5. **Announcements** - Broadcast messages to students
6. **Certificate Verification** - Issue and verify certificates
7. **Feedback** - View student feedback and testimonials
8. **Moderation** - Handle conduct violations

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project: `marlioninternshipportal2025`
3. Enable Authentication (Google, Email, Phone)
4. Create Firestore Database
5. Create Storage bucket

### 2. Deploy Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy rules
firebase deploy --only firestore:rules,storage:rules
```

### 3. Create Admin User

In Firebase Console > Firestore, create a document:

```
Collection: admins
Document ID: <admin-user-uid>
Fields:
  - email: "admin@marliontech.com"
  - name: "Admin Name"
  - role: "super-admin"
  - permissions: ["*"]
  - createdAt: <timestamp>
```

## 🌐 Deployment (DigitalOcean)

### Environment Variables

Set these in DigitalOcean App Platform:

```
# Firebase Admin (Server-side)
FIREBASE_PRIVATE_KEY=xxx

# DigitalOcean Gradient AI  
DO_AI_API_KEY=sk-do--xxx

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app.ondigitalocean.app
```

### Deploy

1. Connect GitHub repository to DigitalOcean
2. Use the provided `.do/app.yaml` spec
3. Set environment variables in DigitalOcean dashboard
4. Deploy!

## 🤖 AI Features (DigitalOcean Gradient - Llama 3.3 70B)

All AI features use DigitalOcean's Gradient AI Platform with the Llama 3.3 70B Instruct model:

- **Interview Agent** - Conducts adaptive 5-minute interviews
- **Bootcamp Helper** - Contextual Q&A for course modules
- **Quiz Generator** - Dynamic quiz generation from content
- **Anti-Cheat Detection** - Typing pattern analysis, AI content detection
- **Semantic Search** - Natural language student/content search
- **Feedback Summarizer** - AI summaries of student work

### AI Client Usage

```typescript
import { getAIClient, chat, complete } from '@marlion/lib/ai';

// Simple completion
const response = await complete('Explain machine learning');

// Chat with system prompt
const answer = await chat(
  'You are a helpful tutor.',
  'What is React?'
);

// Full control
const client = getAIClient();
const result = await client.chatCompletion({
  model: 'llama3.3-70b-instruct', // or 'deepseek-r1-distill-llama-70b'
  messages: [
    { role: 'system', content: 'You are an expert.' },
    { role: 'user', content: 'Explain quantum computing.' }
  ],
  temperature: 0.7,
  max_tokens: 500,
});
```

## 📦 Packages

### @marlion/ui

Shared React components with Tailwind CSS:
- Button, Input, Select, Textarea
- Card, Modal, Alert, Badge
- Tabs, Progress, Avatar, Spinner
- Auth/Theme providers
- Custom hooks (useForm, useToast, useLocalStorage)

### @marlion/lib

AI utilities and helpers:
- DigitalOcean Gradient AI client (Llama 3.3 70B / DeepSeek 70B)
- Interview agent
- Bootcamp helper
- Anti-cheat detection
- Feedback summarizer
- Semantic search
- Firestore CRUD helpers
- Validation schemas (Zod)
- PDF/Email templates

### @marlion/config

Firebase configuration:
- Client SDK setup
- Admin SDK setup
- TypeScript types for all collections

## 🔒 Security

- All credentials in environment variables
- Firebase security rules for data access
- Server-side validation
- Anti-cheat monitoring
- Admin-only operations protected

## 📄 License

Proprietary - Marlion Technologies Pvt. Ltd.

## 🆘 Support

- Email: internship@marliontech.com
- Website: https://marliontech.com
