# Educational Center Management System

A full-stack web application designed for managing educational centers, teachers, students, attendance, salary advances, and notifications with real-time Firebase Firestore synchronization.

## Features
- **Dashboard & Analytics**: Real-time stats, revenue overview, and student attendance charts.
- **Student & Group Management**: Enroll students, assign them to groups, and track progress.
- **Teacher & Staff Portal**: Salary advances, profile management, and activity logging.
- **Real-Time Notifications & Messaging**: Inbox system with broadcast capabilities.
- **Firebase Authentication & Firestore Sync**: Secure cloud data persistence with offline latency compensation.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### Installation
1. Clone the repository and install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env` (or `.env.example`):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running Development Server
```bash
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```
