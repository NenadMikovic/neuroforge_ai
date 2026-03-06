/**
 * Tools Management Page
 */

import ToolManagementDashboard from "@/app/components/ToolManagementDashboard";

export const metadata = {
  title: "Tool Management | NeuroForge",
  description: "Manage and monitor LLM tool execution",
};

export default function ToolsPage() {
  return (
    <main>
      <ToolManagementDashboard />
    </main>
  );
}
