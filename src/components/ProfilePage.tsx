"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Loader2, LogOut, ChevronRight, ArrowLeft, User, X } from "lucide-react";

interface ProfilePageProps {
    username?: string;
    semesters: any[];
    onSemesterChange: (semesterId: string) => void;
    isChangingSemester: boolean;
    onLogout: () => void;
    onBack: () => void;
}

export default function ProfilePage({
    username,
    semesters,
    onSemesterChange,
    isChangingSemester,
    onLogout,
    onBack,
}: ProfilePageProps) {
    const [showSemesterModal, setShowSemesterModal] = useState(false);

    const handleSemesterSelect = (semesterId: string) => {
        onSemesterChange(semesterId);
        setShowSemesterModal(false);
    };

    return (
        <div className="h-full flex flex-col bg-zinc-50">
            {/* Header */}
            <header className="flex-none bg-white px-6 py-4 border-b border-zinc-100 shadow-sm">
                <div className="max-w-xl mx-auto">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-700" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-zinc-900 tracking-tight">
                                Profile <span className="text-zinc-400">Settings</span>
                            </h1>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                                Manage your VTOP session
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-xl mx-auto space-y-6">
                    {/* User Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <User className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-zinc-900">Hi {username || 'User'}! 👋</h2>
                                <p className="text-xs text-zinc-500">Connected & Active</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Semester Selection Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap className="w-5 h-5 text-blue-500" />
                            <h3 className="text-sm font-bold text-zinc-900">Semester Selection</h3>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4">
                            Choose a semester to view its faculty timetable
                        </p>
                        <button
                            onClick={() => setShowSemesterModal(true)}
                            disabled={isChangingSemester}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all group disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-white">Select Semester</p>
                                    <p className="text-xs text-white/70">{semesters.length} available</p>
                                </div>
                            </div>
                            {isChangingSemester ? (
                                <Loader2 className="w-5 h-5 animate-spin text-white" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>
                    </motion.div>

                    {/* Logout Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100"
                    >
                        <h3 className="text-sm font-bold text-zinc-900 mb-4">Session Management</h3>
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-all group border border-red-100"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                <LogOut className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="text-left flex-1">
                                <p className="text-sm font-bold text-red-600">Logout from VTOP</p>
                                <p className="text-xs text-red-500/70">Clear all session data and credentials</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-red-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>
            </main>

            {/* Semester Selection Modal */}
            <AnimatePresence>
                {showSemesterModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowSemesterModal(false)}
                    >
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex-none flex items-center justify-between p-6 border-b border-zinc-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-zinc-900">Select Semester</h3>
                                        <p className="text-xs text-zinc-500">{semesters.length} semesters available</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSemesterModal(false)}
                                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-2">
                                {semesters.map((sem, index) => (
                                    <motion.button
                                        key={sem.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        disabled={isChangingSemester}
                                        onClick={() => handleSemesterSelect(sem.id)}
                                        className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-50 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-blue-200"
                                    >
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors">{sem.name}</p>
                                            <p className="text-xs text-zinc-500">ID: {sem.id}</p>
                                        </div>
                                        {isChangingSemester ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
