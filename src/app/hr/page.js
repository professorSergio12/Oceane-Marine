"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HrPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Statutory Certificates by default
    router.replace("/hr/statutory-certificates");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  );
}
