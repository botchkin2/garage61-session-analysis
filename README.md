# 🏁 Lap Analysis - React Native Racing Telemetry App

A professional React Native application for analyzing racing lap data from Garage 61. Built with TypeScript, React Query, and optimized for both mobile and web platforms.

## ✨ Features

- 📱 **Cross-Platform** - Native mobile apps (iOS/Android) + Web browser support
- 🔐 **Secure API Integration** - Garage 61 API with configurable token storage
- 📊 **Comprehensive Analysis** - Lap times, telemetry data, session comparisons
- ⚙️ **Offline Capable** - Works independently on mobile devices
- 🎨 **Racing Theme** - Professional motorsport-inspired UI
- 📈 **Real-time Charts** - Interactive telemetry visualizations
- 🔄 **Smart Caching** - Optimized API requests with React Query

## 🚀 Quick Start

### Prerequisites

- **Node.js** (>= 18.0.0)
- **npm** or **yarn**
- **Garage 61 API Token** - Personal access token from your Garage 61 account
- **Mobile Development** (optional, for mobile builds):
  - **Android**: Android Studio with Android SDK (API 34+)
  - **iOS**: Xcode 15+ (macOS only)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **iOS Setup** (macOS only):

```bash
cd ios && pod install && cd ..
```

### API Configuration

**For Development:**
Create a `.env.local` file in the root directory:

```env
GARAGE61_API_TOKEN=your_personal_access_token_here
```

**For Production/Mobile:**

- The app includes a Settings screen to configure your API token
- Token is securely stored locally on your device
- No environment variables needed for production builds

## 🏃 Running the App

### Development Mode

#### Web Browser (Recommended for development)

```bash
npm run web
```

Opens at `http://localhost:3000`

#### Android Device/Emulator

```bash
npm run android
```

#### iOS Simulator (macOS only)

```bash
npm run ios
```

### Production Mobile Build

#### Android APK

```bash
# Initialize Android project (first time only)
npx react-native run-android

# Build production APK
npx react-native build-android --mode=release
```

#### iOS (macOS only)

```bash
# Build for iOS
npx react-native build-ios --mode=Release
```

## 📱 Mobile App Usage

### First Time Setup

1. **Install APK** on your Android device
2. **Open App** - You'll see "API TOKEN REQUIRED"
3. **Access Settings** - Tap gear icon (⚙️) in top-right of Driver tab
4. **Enter API Token** - Paste your Garage 61 personal access token
5. **Save & Use** - App now works completely offline!

### Features Available

- **🏁 Driver Profile** - Your Garage 61 account information
- **📊 Lap Analysis** - Browse and analyze lap times
- **📈 Session Analysis** - Detailed telemetry data
- **🔄 Multi-Lap Comparison** - Compare multiple laps
- **⚙️ Settings** - API token management

## 🌐 Web Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (if not already done)
firebase init hosting

# Deploy
firebase deploy
```

## 📁 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── UserProfile.tsx     # Driver profile display
│   │   ├── LapList.tsx         # Lap data lists
│   │   ├── TimeSeriesChart.tsx # Telemetry charts
│   │   └── RacingUI.tsx        # Racing-themed components
│   ├── screens/             # Screen components
│   │   ├── ProfileScreen.tsx   # Driver profile screen
│   │   ├── LapListScreen.tsx   # Lap browsing
│   │   ├── SessionAnalysisScreen.tsx
│   │   ├── MultiLapComparisonScreen.tsx
│   │   └── SettingsScreen.tsx  # API token configuration
│   ├── navigation/          # App navigation
│   │   ├── AppNavigator.native.tsx # Mobile navigation
│   │   └── AppNavigator.web.tsx    # Web navigation
│   ├── hooks/               # Custom React hooks
│   │   ├── useApiQueries.ts     # Data fetching hooks
│   │   └── useCacheManagement.ts # Cache management
│   ├── utils/               # Utilities
│   │   ├── api.ts              # Garage 61 API client
│   │   ├── authContext.tsx     # Authentication context
│   │   ├── queryClient.ts      # React Query configuration
│   │   └── colors.ts           # Color utilities
│   ├── config/              # Configuration
│   │   └── api.ts             # API configuration
│   ├── types/               # TypeScript definitions
│   │   ├── api.ts             # API response types
│   │   └── index.ts           # Main type exports
│   └── theme.ts             # App theming
├── functions/               # Firebase Cloud Functions
├── public/                  # Web static assets
├── android/                 # Android native project
├── ios/                     # iOS native project
├── docs/                    # Documentation
└── package.json
```

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint-fix

# Format code
npm run format

# Type checking
npm run type-check
```

### API Token Setup for Development

The app uses two methods for API token management:

1. **Development**: Environment variable (`GARAGE61_API_TOKEN`)
2. **Production**: Local storage via Settings screen

### Adding New Features

The app is built with modularity in mind:

- **Components**: Add to `src/components/`
- **Screens**: Add to `src/screens/`
- **API Endpoints**: Extend `src/utils/api.ts`
- **Navigation**: Update `src/navigation/AppNavigator.native.tsx`

## 📚 Documentation

See the [`docs/`](./docs/) directory for detailed guides:

- [API Request Optimization](./docs/API_REQUESTS.md)
- [React Query Best Practices](./docs/REACT_QUERY.md)
- [Component Optimization](./docs/COMPONENT_OPTIMIZATION.md)
- [React Native Web Guide](./docs/REACT_NATIVE_WEB.md)

## 🐛 Troubleshooting

### Common Issues

**API Connection Issues:**

- Verify your Garage 61 API token is correct
- Check that your subscription includes API access
- Ensure network connectivity

**Build Issues:**

- Clear Metro cache: `npx react-native start --reset-cache`
- Clean Android: `cd android && ./gradlew clean`
- Reinstall pods: `cd ios && pod install`

**Performance Issues:**

- Enable Hermes in `android/app/build.gradle`
- Use production builds for optimal performance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is private and proprietary.

---

**Built with ❤️ for racing enthusiasts**

_Analyze your laps, improve your times, dominate the track!_ 🏎️💨
