"use client";

import { useState, useEffect } from "react";
import Dashboard from "@/components/Dashboard";
import PandaLogin, { VtopFaculty } from "@/components/PandaLogin";
import BottomNav from "@/components/BottomNav";
import ProfilePage from "@/components/ProfilePage";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [vtopFaculty, setVtopFaculty] = useState<VtopFaculty[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<{ username: string, password: string } | null>(null);
  const [isChangingSemester, setIsChangingSemester] = useState(false);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard');
  const [resetCounter, setResetCounter] = useState(0);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true);

  // Auto-login on mount
  useEffect(() => {
    const savedCreds = localStorage.getItem("vtop_credentials");
    const savedFaculty = localStorage.getItem("vtop_faculty");
    const savedSemesters = localStorage.getItem("vtop_semesters");

    if (savedCreds) {
      const parsedCreds = JSON.parse(savedCreds);
      setCredentials(parsedCreds);

      // Load cached data first for instant UI
      if (savedFaculty) setVtopFaculty(JSON.parse(savedFaculty));
      if (savedSemesters) setSemesters(JSON.parse(savedSemesters));
      setIsLoggedIn(true);

      // Silently refresh in background to check if password is still valid
      fetch("/api/vtop-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedCreds),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setVtopFaculty(data.faculty);
            setSemesters(data.semesters);
            localStorage.setItem("vtop_faculty", JSON.stringify(data.faculty));
            localStorage.setItem("vtop_semesters", JSON.stringify(data.semesters));
          } else if (data.error === "Login failed") {
            // If login fails (password changed), force logout
            handleLogout();
          }
        })
        .catch(err => console.error("Auto-login background refresh failed", err))
        .finally(() => setIsAutoLoggingIn(false));
    } else {
      setIsAutoLoggingIn(false);
    }
  }, []);

  const handleSemesterChange = async (semesterId: string) => {
    if (!credentials) return;
    setIsChangingSemester(true);
    try {
      const res = await fetch("/api/vtop-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, semesterId }),
      });
      const data = await res.json();
      if (data.success) {
        setVtopFaculty(data.faculty);
        localStorage.setItem("vtop_faculty", JSON.stringify(data.faculty));
      }
    } catch (err) {
      console.error("Failed to change semester", err);
    } finally {
      setIsChangingSemester(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setVtopFaculty([]);
    setSemesters([]);
    setCredentials(null);
    setCurrentPage('dashboard');
    localStorage.removeItem("vtop_credentials");
    localStorage.removeItem("vtop_faculty");
    localStorage.removeItem("vtop_semesters");
  };

  const handleNavigateToDashboard = () => {
    setCurrentPage('dashboard');
    setResetCounter(prev => prev + 1); // Trigger Dashboard reset
  };

  if (isAutoLoggingIn) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin mb-4 opacity-50" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Resuming Session...</p>
      </div>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-zinc-900 flex flex-col">
      {/* Desktop Wrapper for App Feel */}
      <div className="flex-1 w-full max-w-md mx-auto bg-white shadow-2xl relative flex flex-col overflow-hidden">
        {currentPage === 'dashboard' ? (
          <Dashboard
            isLoggedIn={isLoggedIn}
            onLoginClick={() => setShowLogin(true)}
            onLogout={handleLogout}
            vtopFaculty={vtopFaculty}
            resetToHome={resetCounter}
          />
        ) : (
          <ProfilePage
            username={credentials?.username}
            semesters={semesters}
            onSemesterChange={handleSemesterChange}
            isChangingSemester={isChangingSemester}
            onLogout={handleLogout}
            onBack={() => setCurrentPage('dashboard')}
          />
        )}

        <BottomNav
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setShowLogin(true)}
          onLogout={handleLogout}
          onNavigateToProfile={() => setCurrentPage('profile')}
          onNavigateToDashboard={handleNavigateToDashboard}
          currentPage={currentPage}
        />
      </div>

      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowLogin(false);
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md p-4 pb-12"
            >
              <button
                onClick={() => setShowLogin(false)}
                className="absolute right-8 top-12 z-[70] text-zinc-400 hover:text-zinc-600 transition-colors p-2"
              >
                ✕
              </button>
              <PandaLogin onLogin={(faculty, semestersObj, creds) => {
                setIsLoggedIn(true);
                setShowLogin(false);
                if (faculty) {
                  setVtopFaculty(faculty);
                  localStorage.setItem("vtop_faculty", JSON.stringify(faculty));
                }
                if (semestersObj) {
                  setSemesters(semestersObj);
                  localStorage.setItem("vtop_semesters", JSON.stringify(semestersObj));
                }
                if (creds) {
                  setCredentials(creds);
                  localStorage.setItem("vtop_credentials", JSON.stringify(creds));
                }
              }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
