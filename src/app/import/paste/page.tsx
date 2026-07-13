import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import PasteImporter from "@/components/PasteImporter";

export default function PasteImportPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Smart extraction"
        title="Turn any job post into a clean application record"
        description="Paste the original content, review the extracted essentials, and save it with the correct deadline and direct link. Long source text stays in the background instead of cluttering your workspace."
      />
      <PasteImporter />
    </AppShell>
  );
}
