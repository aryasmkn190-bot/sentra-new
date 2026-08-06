import { redirect } from "next/navigation";
import { getOnlineOrderReport } from "@/actions/admin";
import { getSession } from "@/lib/session";
import { OnlineOrderReportView } from "./ReportView";

export default async function AdminOnlineReportPage() {
  const session = await getSession("admin");
  if (!session) redirect("/admin/login");

  const reportData = await getOnlineOrderReport("30d");

  return <OnlineOrderReportView initialData={reportData} />;
}
