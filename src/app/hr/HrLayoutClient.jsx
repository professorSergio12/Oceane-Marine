"use client";

import { HrSidebarProvider } from "./HrSidebarContext";

export default function HrLayoutClient({ children }) {
  return <HrSidebarProvider>{children}</HrSidebarProvider>;
}
