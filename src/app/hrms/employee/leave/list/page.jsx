import LeaveListComponent from "@/components/leave/list";
import React, { Suspense } from "react";
import { PageShellSkeleton } from "@/components/skeletons";

const EmployeeList = () => {
  return (
    <Suspense
      fallback={
        <PageShellSkeleton
          showMetrics
          metricCount={4}
          showTable
          tableColumns={8}
          tableRows={8}
        />
      }
    >
      <LeaveListComponent />
    </Suspense>
  );
};

export default EmployeeList;
