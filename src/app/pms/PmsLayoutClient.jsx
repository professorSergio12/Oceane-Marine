"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";

export default function PmsLayoutClient({ children }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="relative min-h-screen bg-transparent text-white pt-6">
      {children}
    </div>
  );
}
