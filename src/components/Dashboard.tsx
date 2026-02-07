"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useFirebaseData, FacultyStatus } from "@/hooks/useFirebase";
import FacultyCard from "./FacultyCard";
import { Search, Loader2, BellRing, ChevronLeft, ChevronRight, LayoutGrid, CheckCircle2, MinusCircle, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";

import { VtopFaculty } from "./PandaLogin";

interface DashboardProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onLogout: () => void;
  vtopFaculty?: VtopFaculty[];
  resetToHome?: number; // Increment this to trigger reset
}

type StatusFilter = "ALL" | "AVAILABLE" | "BUSY" | "UNKNOWN";
type TabType = "HOME" | "MY";

export default function Dashboard({ isLoggedIn, onLoginClick, onLogout, vtopFaculty = [], resetToHome = 0 }: DashboardProps) {
  const { faculty, config, subsCount, loading, subscribeToFaculty, resetWaitCount } = useFirebaseData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [activeTab, setActiveTab] = useState<TabType>("HOME");
  const [localSubscriptions, setLocalSubscriptions] = useState<Set<string>>(new Set());
  const prevStatus = useRef<{ [cabinId: string]: string }>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset to HOME tab when resetToHome changes
  useEffect(() => {
    if (resetToHome > 0) {
      setActiveTab("HOME");
    }
  }, [resetToHome]);

  // Switch to MY tab when user logs into VTOP
  useEffect(() => {
    if (vtopFaculty.length > 0) {
      setActiveTab("MY");
    }
  }, [vtopFaculty.length]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast.success("Notifications enabled!", {
            description: "You'll be notified when faculty become available."
          });
        } else {
          console.log("Notification permission denied or dismissed.");
        }
      });
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('Service Worker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.error('Service Worker registration failed: ', err);
        }
      );
    }
  }, []);

  useEffect(() => {
    Object.entries(faculty).forEach(([cabinId, data]) => {
      const prev = prevStatus.current[cabinId];

      // If status changed to AVAILABLE
      if (data.status === "AVAILABLE" && prev !== "AVAILABLE") {
        const facultyName = config[cabinId] || cabinId;

        // Reset wait count if it was greater than 0
        if (subsCount[cabinId] > 0) {
          resetWaitCount(cabinId);
        }

        // Only notify if user explicitly clicked "Notify Me" for this cabinId
        if (localSubscriptions.has(cabinId)) {
          console.log(`[Notification] Triggering for ${facultyName} at ${cabinId}`);

          // 1. System Notification (Native Mobile/Desktop)
          const notificationTitle = `${facultyName} is Available!`;
          const notificationOptions: any = {
            body: `Dr. ${facultyName} is now available in ${cabinId}.`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            vibrate: [200, 100, 200],
            tag: cabinId,
            requireInteraction: true, // Keep it visible until dismissed on desktop
          };

          if ("serviceWorker" in navigator && Notification.permission === "granted") {
            navigator.serviceWorker.ready.then((registration) => {
              console.log("[Notification] Sending via Service Worker");
              registration.showNotification(notificationTitle, notificationOptions)
                .catch(err => {
                  console.error("[Notification] SW failed, falling back:", err);
                  new Notification(notificationTitle, notificationOptions);
                });
            }).catch(() => {
              console.log("[Notification] SW not ready, falling back to standard");
              new Notification(notificationTitle, notificationOptions);
            });
          } else if ("Notification" in window && Notification.permission === "granted") {
            console.log("[Notification] Sending via standard Web API");
            new Notification(notificationTitle, notificationOptions);
          } else {
            console.warn("[Notification] Permission not granted or API not supported", Notification.permission);
          }

          // 2. In-App Toast
          toast.success(`${facultyName} is now available!`, {
            description: `Location: ${cabinId}`,
            icon: <BellRing className="w-4 h-4 text-green-500" />,
            duration: 10000,
          });

          // Remove from local subscriptions after notifying
          setLocalSubscriptions(prev => {
            const next = new Set(prev);
            next.delete(cabinId);
            return next;
          });
        }
      }
      prevStatus.current[cabinId] = data.status;
    });
  }, [faculty, config, localSubscriptions, subsCount, resetWaitCount]);

  const handleSubscribe = async (cabinId: string) => {
    const success = await subscribeToFaculty(cabinId);
    if (success) {
      setLocalSubscriptions(prev => new Set(prev).add(cabinId));
    }
    return success;
  };

  const filteredFaculty = useMemo(() => {
    let items: { cabinId: string; name: string; data: FacultyStatus | undefined; source: string }[] = [];

    if (activeTab === "HOME") {
      // 1. Get Firebase faculty for Home
      items = Object.entries(config)
        .map(([cabinId, name]) => ({
          cabinId,
          name,
          data: faculty[cabinId] as FacultyStatus | undefined,
          source: 'firebase'
        }));
    } else {
      // 2. Get VTOP faculty for "My"
      items = vtopFaculty.map(vf => ({
        cabinId: vf.cabinId,
        name: vf.name,
        data: faculty[vf.cabinId] as FacultyStatus | undefined, // Check if VTOP faculty exists in realtime DB status
        source: 'vtop'
      }));
    }

    // 3. Filter
    return items.filter(({ cabinId, name, data }) => {
      const nameLower = name?.toLowerCase() || "";
      const idLower = cabinId.toLowerCase();
      const term = search.toLowerCase();
      const matchesSearch = nameLower.includes(term) || idLower.includes(term);

      if (!matchesSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "AVAILABLE") return data?.status === "AVAILABLE";
      if (statusFilter === "BUSY") return data?.status === "BUSY";
      if (statusFilter === "UNKNOWN") return !data || !data.status;
      return true;
    });
  }, [faculty, config, search, statusFilter, vtopFaculty, activeTab]);

  // Pagination logic - 4 cards per page
  const CARDS_PER_PAGE = 4;
  const totalPages = Math.ceil(filteredFaculty.length / CARDS_PER_PAGE);
  const [currentPageNum, setCurrentPageNum] = useState(0);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPageNum(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [search, statusFilter, activeTab]);

  // Get current page items
  const paginatedFaculty = useMemo(() => {
    const pages = [];
    for (let i = 0; i < filteredFaculty.length; i += CARDS_PER_PAGE) {
      pages.push(filteredFaculty.slice(i, i + CARDS_PER_PAGE));
    }
    return pages;
  }, [filteredFaculty]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" />
          <p className="text-zinc-500 font-medium">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden">
      <Toaster position="top-center" expand={true} richColors />

      <header className="flex-none bg-white px-6 py-4 border-b border-zinc-100 shadow-sm z-10">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-black text-zinc-900 tracking-tight">
                Faculty <span className="text-zinc-400">Hub</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                <p className="text-[7px] text-zinc-400 font-bold uppercase tracking-widest">
                  Live Status
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-white p-0.5 rounded-lg border border-zinc-200 shadow-sm">
              <button
                onClick={() => setActiveTab("HOME")}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === "HOME"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-white text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                HOME
              </button>
              <button
                onClick={() => setActiveTab("MY")}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === "MY"
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "bg-white text-zinc-500 hover:text-zinc-700"
                  }`}
              >
                MY FACULTY
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeTab === "HOME" ? "all" : "your"} faculty...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-xl pl-10 pr-4 py-1.5 text-[11px] focus:ring-1 focus:ring-zinc-900 transition-all group-hover:bg-zinc-200/50"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {(["ALL", "AVAILABLE", "BUSY", "UNKNOWN"] as StatusFilter[]).map((filter) => {
                const isActive = statusFilter === filter;
                let Icon = LayoutGrid;
                let color = "text-zinc-400";
                if (filter === "AVAILABLE") { Icon = CheckCircle2; color = "text-emerald-500"; }
                if (filter === "BUSY") { Icon = MinusCircle; color = "text-rose-500"; }
                if (filter === "UNKNOWN") { Icon = HelpCircle; color = "text-slate-400"; }

                return (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold transition-all border whitespace-nowrap ${isActive
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-200"
                      : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive && filter === "ALL" ? "text-white" : color}`} />
                    <span>{filter.charAt(0) + filter.slice(1).toLowerCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Paginated Cards */}
          <div className="flex-1 overflow-hidden">
            {paginatedFaculty.length > 0 ? (
              <div
                ref={scrollContainerRef}
                className="h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar text-zinc-900"
                onScroll={(e) => {
                  const scrollLeft = e.currentTarget.scrollLeft;
                  const pageWidth = e.currentTarget.clientWidth;
                  const newPage = Math.round(scrollLeft / pageWidth);
                  if (newPage !== currentPageNum) {
                    setCurrentPageNum(newPage);
                  }
                }}
              >
                <div className="h-full flex">
                  {paginatedFaculty.map((pageItems, pageIndex) => (
                    <div
                      key={pageIndex}
                      className="h-full flex-shrink-0 w-full snap-center px-6 py-4"
                    >
                      <div className="max-w-xl mx-auto h-full flex items-start">
                        <div className="w-full grid grid-cols-2 gap-4">
                          {pageItems.map((item) => (
                            <FacultyCard
                              key={item.cabinId}
                              cabinId={item.cabinId}
                              name={item.name}
                              data={item.data}
                              count={subsCount[item.cabinId] || 0}
                              onNotify={handleSubscribe}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                <Search className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">
                  {activeTab === "MY" && vtopFaculty.length === 0
                    ? "Login to see your faculty"
                    : "No matches found"}
                </p>
              </div>
            )}
          </div>

          {/* Page Indicators */}
          {totalPages > 1 && (
            <div className="flex-none pb-20 pt-4">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({
                        left: Math.max(0, currentPageNum - 1) * scrollContainerRef.current.clientWidth,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  disabled={currentPageNum === 0}
                  className="p-2 rounded-full hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-600" />
                </button>

                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (scrollContainerRef.current) {
                          scrollContainerRef.current.scrollTo({
                            left: idx * scrollContainerRef.current.clientWidth,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className={`transition-all ${idx === currentPageNum
                        ? "w-6 h-1.5 bg-zinc-900 rounded-full"
                        : "w-1.5 h-1.5 bg-zinc-300 rounded-full hover:bg-zinc-400"
                        }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (scrollContainerRef.current) {
                      scrollContainerRef.current.scrollTo({
                        left: Math.min(totalPages - 1, currentPageNum + 1) * scrollContainerRef.current.clientWidth,
                        behavior: 'smooth'
                      });
                    }
                  }}
                  disabled={currentPageNum === totalPages - 1}
                  className="p-2 rounded-full hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main >
    </div >
  );
}

