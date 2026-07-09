import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import PasteImporter from "@/components/PasteImporter";

export default function PasteImportPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="AI Paste Parser"
        title="Paste any job post. Get a clean, trackable job card."
        description="Paste full job content from LinkedIn, a company page, email, or a circular. The parser extracts title, company, deadline, location, role type, category, and relevance score."
      />
      <div className="glass rounded-[2rem] p-5">
        <PasteImporter />
      </div>
    </AppShell>
  );
}
