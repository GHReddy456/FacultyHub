## Project Summary
Faculty Availability Tracker is a real-time web application that mirrors and reacts to a Firebase Realtime Database. It provides students with live updates on faculty status (Available/Busy) based on IoT data from NodeMCU devices.

## Tech Stack
- Frontend: Next.js (React), Tailwind CSS
- Animation: Framer Motion
- Database: Firebase Realtime Database
- Icons: Lucide React
- Notifications: Sonner (In-app), Browser Notifications API

## Architecture
- `src/lib/firebase.ts`: Firebase SDK initialization.
- `src/hooks/useFirebase.ts`: Custom hook for real-time data subscription and database transactions.
- `src/components/Dashboard.tsx`: Main view with search and real-time state management.
- `src/components/FacultyCard.tsx`: Presentational component for faculty status and notification subscription.
- `src/components/PandaLogin.tsx`: Interactive login overlay with SVG animations.
- `src/components/BottomNav.tsx`: Navigation bar for switching between Dashboard and Login/Profile.

## User Preferences
- Directly mirror Firebase schema without data reshaping.
- Dashboard as the default landing page.
- VTOP-style login with Panda animation accessible via bottom bar.
- Functional components preferred.
- No comments in code.

## Project Guidelines
- Firebase is the single source of truth; no local mock data.
- UI must survive partial data loads.
- Client-side notifications triggered on "BUSY" -> "AVAILABLE" transitions.
- Status color rules: BUSY (Red), AVAILABLE (Green).
