"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, LogIn, UserCircle, LogOut } from "lucide-react";

interface BottomNavProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToDashboard?: () => void;
  currentPage?: 'dashboard' | 'profile';
}

export default function BottomNav({
  isLoggedIn,
  onLoginClick,
  onLogout,
  onNavigateToProfile,
  onNavigateToDashboard,
  currentPage = 'dashboard'
}: BottomNavProps) {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 px-6">
      <div className="mx-auto max-w-[280px]">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-0.5 shadow-xl flex items-center justify-around"
        >
          <button
            onClick={onNavigateToDashboard}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-all active:scale-95 ${currentPage === 'dashboard' ? 'text-white' : 'text-white/60 hover:text-white'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Home</span>
          </button>

          <div className="w-px h-4 bg-white/10" />

          {isLoggedIn ? (
            <>
              <button
                onClick={onNavigateToProfile}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-all active:scale-95 ${currentPage === 'profile' ? 'text-white' : 'text-white/60 hover:text-white'
                  }`}
              >
                <UserCircle className="w-4 h-4" />
                <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Me</span>
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex-1 flex flex-col items-center gap-0.5 py-1.5 text-white/60 hover:text-white transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Login</span>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
