import { redirect } from "next/navigation";
import { getOnlineOrderReport } from "@/actions/admin";
import { getSession } from "@/lib/session";
import { OnlineOrderReportView } from "./ReportView";

export default async function AdminOnlineReportPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; period?: string; status?: string }>;
}) {
  const session = await getSession("admin");
  if (!session) redirect("/admin/login");

  const sp = await searchParams;
  const initialBatch = sp?.batch || "all";
  const initialPeriod = (sp?.period as any) || "30d";
  const initialStatus = sp?.status || "all";

  const reportData = await getOnlineOrderReport({
    period: initialPeriod,
    batchId: initialBatch,
    statusFilter: initialStatus,
  });

  return (
    <OnlineOrderReportView
      initialData={reportData}
      initialBatch={initialBatch}
      initialPeriod={initialPeriod}
      initialStatus={initialStatus}
    />
  );
}
