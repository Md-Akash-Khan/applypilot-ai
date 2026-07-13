import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ManualJobForm from "@/components/ManualJobForm";

export default function ManualImportPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Manual entry"
        title="Save an opportunity in under a minute"
        description="Add the same essentials you previously kept in a spreadsheet: role, company, deadline, status, and a direct link."
      />
      <ManualJobForm />
    </AppShell>
  );
}
