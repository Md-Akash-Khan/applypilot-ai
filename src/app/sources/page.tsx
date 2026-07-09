import { formatDistanceToNow } from "date-fns";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import SourceForm from "@/components/SourceForm";
import ScanButton from "@/components/ScanButton";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseJsonArray } from "@/lib/json";

export default async function SourcesPage() {
  const user = await requireUser();
  const sources = await prisma.jobSource.findMany({ where: { userId: user.id }, include: { logs: { orderBy: { scannedAt: "desc" }, take: 1 }, _count: { select: { jobs: true } } }, orderBy: { createdAt: "desc" } });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Smart Sources"
        title="Career page monitor"
        description="Add company, government, academic, and career URLs once. ApplyPilot AI will classify imported jobs automatically."
        action={<ScanButton />}
      />

      <SourceForm />

      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-black">Saved sources</h2>
        {sources.map((source) => (
          <div key={source.id} className="glass rounded-3xl p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="badge">{source.status}</span>
                  <span className="badge">{source.scanFrequency.replaceAll("_", " ")}</span>
                  <span className="badge">{source._count.jobs} jobs</span>
                </div>
                <h3 className="text-xl font-black">{source.name}</h3>
                <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-cyan-100/80">{source.url}</a>
                <div className="mt-4 flex flex-wrap gap-2">
                  {parseJsonArray(source.keywords).map((keyword) => <span className="badge" key={keyword}>{keyword}</span>)}
                </div>
                <div className="mt-3 text-xs text-white/45">
                  Last scanned: {source.lastScannedAt ? formatDistanceToNow(source.lastScannedAt, { addSuffix: true }) : "Never"}
                  {source.lastError ? ` • Error: ${source.lastError}` : ""}
                </div>
              </div>
              <ScanButton sourceId={source.id} />
            </div>
          </div>
        ))}
        {!sources.length ? <div className="glass rounded-3xl p-8 text-center text-white/60">No sources yet. Add your first career page above.</div> : null}
      </section>
    </AppShell>
  );
}
