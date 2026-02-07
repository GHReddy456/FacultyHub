"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue, set, runTransaction } from "firebase/database";
import { db } from "@/lib/firebase";

export interface FacultyStatus {
  status: "BUSY" | "AVAILABLE";
  updatedAt: string;
}

export interface FacultyConfig {
  [cabinId: string]: string;
}

export interface SubsCount {
  [cabinId: string]: number;
}

export function useFirebaseData() {
  const [faculty, setFaculty] = useState<{ [cabinId: string]: FacultyStatus }>({});
  const [config, setConfig] = useState<FacultyConfig>({});
  const [subsCount, setSubsCount] = useState<SubsCount>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const facultyRef = ref(db, "faculty");
    const configRef = ref(db, "facultyConfig");
    const subsCountRef = ref(db, "subsCount");

    let facultyLoaded = false;
    let configLoaded = false;

    const checkLoading = () => {
      if (facultyLoaded && configLoaded) {
        setLoading(false);
      }
    };

    const unsubFaculty = onValue(facultyRef, (snapshot) => {
      setFaculty(snapshot.val() || {});
      facultyLoaded = true;
      checkLoading();
    });

    const unsubConfig = onValue(configRef, (snapshot) => {
      const dbConfig = snapshot.val() || {};
      setConfig(dbConfig);
      configLoaded = true;
      checkLoading();
    });

    const unsubSubsCount = onValue(subsCountRef, (snapshot) => {
      setSubsCount(snapshot.val() || {});
    });

    return () => {
      unsubFaculty();
      unsubConfig();
      unsubSubsCount();
    };
  }, []);

  const subscribeToFaculty = useCallback(async (cabinId: string) => {
    const studentId = Math.random().toString(36).substring(7);
    const subRef = ref(db, `studentSubs/${cabinId}/${studentId}`);
    const countRef = ref(db, `subsCount/${cabinId}`);

    try {
      await set(subRef, true);
      await runTransaction(countRef, (current) => (current || 0) + 1);
      return true;
    } catch (error) {
      console.error("Subscription failed:", error);
      return false;
    }
  }, []);

  const resetWaitCount = useCallback(async (cabinId: string) => {
    const countRef = ref(db, `subsCount/${cabinId}`);
    try {
      await set(countRef, 0);
      return true;
    } catch (error) {
      console.error("Reset count failed:", error);
      return false;
    }
  }, []);

  return { faculty, config, subsCount, loading, subscribeToFaculty, resetWaitCount };
}
