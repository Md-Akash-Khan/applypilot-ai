import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ManualJobForm from "@/components/ManualJobForm";

export default function ManualImportPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Manual Entry"
        title="Save a job manually"
        description="Use this when you already know the role, deadline, company, and apply link."
      />
      <ManualJobForm />
    </AppShell>
  );
}
