# SevaBot Mobile App 📱

React Native mobile app for SevaBot — A RAG-based Nepali Legal Chatbot.

## Project Structure

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx      # Login with username/password
│   │   ├── SignupScreen.tsx     # New account registration
│   │   └── ChatScreen.tsx      # Main chatbot interface
│   └── services/
│       └── api.ts              # API service (mirrors frontend/src/services/api.js)
├── App.tsx                     # Root with navigation + auth check
└── android/ ios/               # Native platform files
```

## Features

- 🔐 **Login / Signup** screens with Nepali UI
- 💬 **Chat screen** with full message history
- 📋 **Sidebar** — conversation list, new chat, logout
- ✏️ **Edit messages** — resend with updated content
- 🤖 **RAG responses** — connects to Django backend
- 🌙 **Dark sidebar** + blue/purple gradient branding

## Setup

### 1. Configure API URL

In `src/services/api.ts`, change `API_BASE_URL` to match your backend:

```ts
// Android Emulator (default)
const API_BASE_URL = 'http://10.0.2.2:8000/api';

// Physical Device (use your machine IP)
const API_BASE_URL = 'http://192.168.x.x:8000/api';
```

### 2. Install dependencies

```bash
cd mobile
npm install
```

### 3. Run on Android

```bash
# Start Metro bundler
npm start

# In another terminal
npm run android
```

### 4. Run Doctor (optional)

```bash
npx react-native doctor
```

## Dependencies

| Package | Purpose |
|---|---|
| `axios` | HTTP API calls |
| `@react-native-async-storage/async-storage` | Token storage (replaces localStorage) |
| `@react-navigation/native` + `native-stack` | Screen navigation |
| `react-native-screens` | Navigation optimization |
| `react-native-safe-area-context` | Safe area insets |
