"use client";

import { motion } from "framer-motion";
import { Bell, User, MapPin, Activity, Users, HelpCircle } from "lucide-react";
import { FacultyStatus } from "@/hooks/useFirebase";
import { useState } from "react";

interface FacultyCardProps {
  cabinId: string;
  name: string;
  data: FacultyStatus | undefined;
  count: number;
  onNotify: (cabinId: string) => Promise<boolean>;
}

export default function FacultyCard({ cabinId, name, data, count, onNotify }: FacultyCardProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const status = data?.status || "UNKNOWN";
  const isAvailable = status === "AVAILABLE";
  const isBusy = status === "BUSY";
  const isUnknown = status === "UNKNOWN";

  const handleNotify = async () => {
    setIsSubscribing(true);
    const success = await onNotify(cabinId);
    if (success) {
      setIsSubscribed(true);
    }
    setIsSubscribing(false);
  };

  const getThemeColors = () => {
    if (isAvailable) return "bg-green-50/50 border-green-100 text-green-700";
    if (isBusy) return "bg-red-50/50 border-red-100 text-red-700";
    return "bg-zinc-50 border-zinc-200 text-zinc-500";
  };

  const getIconColor = () => {
    if (isAvailable) return "text-green-600";
    if (isBusy) return "text-red-600";
    return "text-zinc-400";
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative overflow-hidden rounded-2xl p-3.5 border transition-all duration-300 shadow-sm flex flex-col justify-between h-[170px] ${getThemeColors().split(' ').slice(0, 2).join(' ')}`}
    >
      <div className={`absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-2xl opacity-10 ${isAvailable ? "bg-green-500" : isBusy ? "bg-red-500" : "bg-zinc-500"
        }`} />

      <div className="relative z-10 space-y-1.5">
        <div className="flex justify-between items-start">
          <div className="p-1.5 rounded-lg bg-white shadow-sm border border-zinc-100">
            <User className={`w-3.5 h-3.5 ${getIconColor()}`} />
          </div>
          <div className={`px-1.5 py-0.5 rounded-full text-[7px] font-black tracking-wider uppercase ${getThemeColors().split(' ').slice(2).join(' ')} ${isAvailable ? "bg-green-100" : isBusy ? "bg-red-100" : "bg-zinc-200"
            }`}>
            {status}
          </div>
        </div>

        <div>
          <h3 className="text-[11px] font-black text-zinc-800 line-clamp-2 leading-tight min-h-[2.4em]">{name || "Unnamed Faculty"}</h3>
          <div className="flex items-center gap-1 mt-0.5 text-zinc-500 text-[9px]">
            <MapPin className="w-2 h-2" />
            <span>{cabinId}</span>
          </div>
        </div>

        <div className="flex gap-1.5">
          <div className="flex-1 bg-white/60 p-1 rounded-md border border-zinc-100/50">
            <p className="text-[7px] text-zinc-400 font-bold uppercase flex items-center gap-1">
              <Activity className="w-1.5 h-1.5" /> Time
            </p>
            <p className="text-zinc-700 font-mono text-[8px] truncate">{data?.updatedAt?.split(' ')[1] || "N/A"}</p>
          </div>
          <div className="flex-1 bg-white/60 p-1 rounded-md border border-zinc-100/50">
            <p className="text-[7px] text-zinc-400 font-bold uppercase flex items-center gap-1">
              <Users className="w-1.5 h-1.5" /> Wait
            </p>
            <p className="text-zinc-700 font-black text-[9px]">{count || 0}</p>
          </div>
        </div>
      </div>

      {!isAvailable && (
        <button
          onClick={handleNotify}
          disabled={isSubscribed || isSubscribing}
          className={`w-full group relative flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${isSubscribed
            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
            : "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 shadow-sm"
            }`}
        >
          {isSubscribing ? (
            <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Bell className={`w-2.5 h-2.5 ${isSubscribed ? "" : "group-hover:animate-ring"}`} />
              <span>{isSubscribed ? "Queued" : "Notify Me"}</span>
            </>
          )}
        </button>
      )}

      {isAvailable && (
        <div className="w-full py-1.5 rounded-lg text-[8px] font-bold bg-green-100 text-green-700 text-center uppercase tracking-wider border border-green-200">
          Available Now
        </div>
      )}
    </motion.div>
  );
}

