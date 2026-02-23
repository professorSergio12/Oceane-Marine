"use client";

import { Suspense } from "react";
import TransferLocationQuestFormContent from "./TransferLocationQuestFormPage";
import SideBarSkeleton from "../../../components/SideBarSkeleton";

export default function TransferLocationQuestFormPage() {
  return (
    <Suspense fallback={<SideBarSkeleton />}>
      <TransferLocationQuestFormContent />
    </Suspense>
  );
}
