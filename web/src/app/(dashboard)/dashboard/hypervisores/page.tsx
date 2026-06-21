import { OperationsPage } from "@/components/monitoring/operations-page";
import { TelemetryHistory } from "@/components/monitoring/telemetry-history";

export default function Page() {
  return <div className="space-y-5"><OperationsPage kind="hypervisors" /><TelemetryHistory /></div>;
}
