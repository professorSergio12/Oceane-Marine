"use client";

import QhseContentArea from "../components/QhseContentArea";
import { QhseStandardPageHeader } from "../components/QhseStandardPageHeader";
import SharepointFileBrowser from "@/app/components/SharepointFileBrowser";

export default function QhseDocumentsContent() {
  return (
    <QhseContentArea>
      <div className="w-full mx-auto py-4 sm:py-6 md:py-10 space-y-4 sm:space-y-6 px-3 sm:px-4">
        <QhseStandardPageHeader
          breadcrumb="QHSE / Documents"
          title="SharePoint Documents"
        />
        <SharepointFileBrowser module="QHSE" label="QHSE" />
      </div>
    </QhseContentArea>
  );
}
