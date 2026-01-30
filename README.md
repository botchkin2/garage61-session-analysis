# Lap Analysis - React Native App

A React Native application built with TypeScript and best practices for racing telemetry analysis.

## 📚 Documentation

See the [`docs/`](./docs/) directory for development guides:

- [API Request Optimization](./docs/API_REQUESTS.md)
- [React Query Best Practices](./docs/REACT_QUERY.md)
- [Component Optimization](./docs/COMPONENT_OPTIMIZATION.md)
- [React Native Web Guide](./docs/REACT_NATIVE_WEB.md)

## Prerequisites

- Node.js (>= 18)
- npm or yarn
- React Native development environment set up:
  - For iOS: Xcode (macOS only)
  - For Android: Android Studio with Android SDK

## Getting Started

### Initial Setup

This project structure is set up, but you'll need to initialize the native iOS and Android projects. You have two options:

#### Option 1: Use React Native CLI (Recommended)

```bash
# Initialize React Native project (this will create ios/ and android/ folders)
npx react-native init LapAnalysis --template react-native-template-typescript

# Then copy over the src/ folder, App.tsx, and config files from this project
# Or manually merge the configurations
```

#### Option 2: Manual Setup

If you already have a React Native project initialized, just install dependencies:

1. Install dependencies:

```bash
npm install
# or
yarn install
```

2. For iOS (macOS only):

```bash
cd ios && pod install && cd ..
```

### Running the App

#### iOS

```bash
npm run ios
# or
yarn ios
```

#### Android

```bash
npm run android
# or
yarn android
```

#### Web (Browser)

```bash
npm run web
# or
yarn web
```

This will start a development server at `http://localhost:3000` and open it in your browser.

#### Start Metro Bundler

```bash
npm start
# or
yarn start
```

## Project Structure

```
.
├── src/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── navigation/     # Navigation configuration
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript type definitions
├── App.tsx             # Root component
├── index.js            # Mobile entry point
├── index.web.js        # Web entry point
├── webpack.config.js   # Webpack config for web
├── public/             # Web static files
│   └── index.html      # HTML template
└── package.json
```

## Features

- ✅ TypeScript support
- ✅ Organized folder structure
- ✅ Path aliases for cleaner imports
- ✅ ESLint and Prettier configured
- ✅ Safe area handling
- ✅ Modern React Native practices
- ✅ **Web support** - Run in browser with React Native Web

## Development

### Code Style

The project uses ESLint and Prettier for code formatting. Run:

```bash
npm run lint
```

### TypeScript

TypeScript is configured with strict mode enabled. Path aliases are set up for easier imports:

- `@/` - src root
- `@components/` - components folder
- `@screens/` - screens folder
- `@navigation/` - navigation folder
- `@utils/` - utils folder
- `@types/` - types folder

## Next Steps

This is a basic Hello World app. You can now:

- Add navigation (React Navigation)
- Create new screens and components
- Add state management (Redux, Zustand, etc.)
- Integrate APIs
- Add styling libraries (styled-components, etc.)
