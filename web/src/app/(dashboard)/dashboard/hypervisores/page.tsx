import { OperationsPage } from "@/components/monitoring/operations-page";
import { TelemetryHistory } from "@/components/monitoring/telemetry-history";
import { VMwareInventoryComparison } from "@/components/monitoring/vmware-inventory-comparison";

export default function Page() {
  return <div className="space-y-5"><OperationsPage kind="hypervisors" /><VMwareInventoryComparison /><TelemetryHistory /></div>;
}
