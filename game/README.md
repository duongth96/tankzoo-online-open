# Tank Dien Client

Game Client using Vite, Phaser 3, and Socket.IO.
Supports Android/iOS via Capacitor.

## Prerequisites

- Node.js installed.
- Server running (see `../server`).

## Setup

1. Install dependencies:
   ```bash
   cd game
   npm install
   ```

2. Configuration:
   - Edit `src/config.js` to set your Server URL.
   - If testing on Android/iOS, change `localhost` to your computer's IP address (e.g., `http://192.168.1.X:3000`).

3. Development Server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` (or the port Vite shows).

## Build for Production / Mobile

1. Build the web assets:
   ```bash
   npm run build
   ```
   This creates a `dist` folder.

2. Add Android platform (first time only):
   ```bash
   npx cap add android
   ```

3. Sync changes to Android project:
   ```bash
   npx cap sync
   ```

4. Open in Android Studio:
   ```bash
   npx cap open android
   ```

## Project Structure

- `src/config.js`: Server URL configuration.
- `src/constants`: Shared constants/events.
- `src/managers`: Game logic managers (Player, Obstacle, PowerUp).
- `src/scenes`: Phaser scenes.
- `src/utils`: Helpers (Socket).
- `public/assets`: Static assets (game.proto).
