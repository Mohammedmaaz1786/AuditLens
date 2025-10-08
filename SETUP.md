# Audit Lens - Setup Guide

## 🎉 Application Status: RUNNING SUCCESSFULLY

Your application is currently running at:
- **Local:** http://localhost:3000
- **Network:** http://192.168.0.107:3000

All pages are compiling and working correctly:
- ✅ Dashboard
- ✅ Invoices  
- ✅ Vendors
- ✅ Reports
- ✅ Security
- ✅ Audit Trail
- ✅ Settings

---

## 🔧 Setup Requirements

### 1. Google AI API Key (Required for AI Features)

The application uses Google's Gemini AI through Genkit. To enable AI features:

1. Get your API key from: https://aistudio.google.com/app/apikey
2. Open `.env.local` file in the root directory
3. Replace `your_google_ai_api_key_here` with your actual API key:
   ```
   GOOGLE_API_KEY=your_actual_api_key
   GEMINI_API_KEY=your_actual_api_key
   ```
4. Restart the development server

### 2. Firebase Configuration (Optional)

If you want to use Firebase features, add your Firebase config to `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## 🐛 Fixing TypeScript Editor Errors

If you see TypeScript errors in VS Code like "Cannot find module '@/components/...'":

**Solution 1 - Restart TypeScript Server:**
1. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac)
2. Type: "TypeScript: Restart TS Server"
3. Press Enter

**Solution 2 - Reload VS Code Window:**
1. Press `Ctrl + Shift + P` (or `Cmd + Shift + P` on Mac)
2. Type: "Developer: Reload Window"
3. Press Enter

**Note:** These are just editor display errors. The application compiles and runs perfectly!

---

## 🚀 Running the Application

```powershell
# Development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

---

## 📦 Installed Packages

- **Framework:** Next.js 15.3.3
- **UI Library:** Radix UI Components
- **Styling:** Tailwind CSS
- **AI:** Genkit with Google AI
- **Database:** Firebase
- **Charts:** Recharts
- **Tables:** TanStack Table
- **Forms:** React Hook Form with Zod
- **Icons:** Lucide React

---

## 🎨 Features

### AI-Powered Flows
- Automate compliance rule selection
- Optimize costs with AI suggestions
- Predict fraud risk

### Data Management
- Invoice management with filtering and sorting
- Vendor assessment and tracking
- Interactive data tables with pagination

### Security & Compliance
- Audit trail tracking
- Security monitoring
- Compliance reporting

---

## 📝 Notes

- The application is using React 19.0.0
- TypeScript is configured for strict mode
- All AI features require GOOGLE_API_KEY to be set
- The application uses the App Router (Next.js 15)

---

## 🆘 Support

If you encounter any issues:
1. Check that all dependencies are installed: `npm install`
2. Ensure `.env.local` has the required API keys
3. Restart the development server
4. Clear Next.js cache: `rm -rf .next` (or `Remove-Item -Recurse -Force .next` in PowerShell)

---

**Last Updated:** October 8, 2025
