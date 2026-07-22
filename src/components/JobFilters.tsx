"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, Search, X } from "lucide-react";

export type JobFilterSuggestion = {
  value: string;
  label: string;
  meta?: string | null;
};

type Props = {
  initialQuery: string;
  category?: string;
  status?: string;
  deadline: string;
  link: string;
  sort: string;
  suggestions: JobFilterSuggestion[];
};

export default function JobFilters({ initialQuery, category, status, deadline, link, sort, suggestions }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [exact, setExact] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const matches = useMemo(() => {
    const search = query.toLowerCase().trim();
    if (search.length < 1) return [];
    const tokens = search.split(/\s+/).filter(Boolean);
    return suggestions
      .filter((item) => tokens.every((token) => `${item.value} ${item.meta || ""}`.toLowerCase().includes(token)))
      .slice(0, 7);
  }, [query, suggestions]);

  function choose(value: string) {
    setQuery(value);
    setExact(true);
    setOpen(false);
    const form = formRef.current;
    if (form) window.requestAnimationFrame(() => form.requestSubmit());
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const data = new FormData(event.currentTarget);
    for (const [key, value] of data.entries()) {
      const clean = String(value).trim();
      if (clean) params.set(key, clean);
    }
    router.push(`/jobs${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form ref={formRef} className="job-filter-panel card mb-6" action="/jobs" role="search" onSubmit={submit}>
      <input type="hidden" name="match" value={exact ? "exact" : "related"} />
      <div className="job-filter-search">
        <label className="relative block">
          <span className="sr-only">Search jobs</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--subtle)]" size={18} />
          <input
            className="input job-search-input"
            name="q"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setExact(false); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            placeholder="Try ‘software’, ‘data analyst’, or a company name"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && matches.length > 0}
            aria-controls="job-search-suggestions"
          />
          {query ? (
            <button type="button" className="job-search-clear" onClick={() => { setQuery(""); setExact(false); setOpen(false); }} aria-label="Clear search">
              <X size={16} />
            </button>
          ) : null}
        </label>
        {open && matches.length ? (
          <div id="job-search-suggestions" className="job-suggestions" role="listbox">
            {matches.map((item, index) => (
              <button key={`${item.value}-${index}`} type="button" role="option" className="job-suggestion" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item.value)}>
                <Search size={15} />
                <span className="min-w-0 flex-1 text-left"><strong className="block truncate">{item.label}</strong>{item.meta ? <small className="block truncate">{item.meta}</small> : null}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="job-filter-grid">
        <FilterSelect name="category" defaultValue={category || ""} label="Category">
          <option value="">All categories</option>
          <option value="GOVERNMENT">Government</option>
          <option value="PRIVATE_CORPORATE">Private & Corporate</option>
          <option value="ACADEMIC_RESEARCH">Academic & Research</option>
          <option value="UNCATEGORIZED">Uncategorized</option>
        </FilterSelect>
        <FilterSelect name="status" defaultValue={status || ""} label="Status">
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="SAVED">Saved</option>
          <option value="APPLIED">Applied</option>
          <option value="INTERVIEW">Interview</option>
          <option value="OFFER">Offer</option>
          <option value="REJECTED">Rejected</option>
          <option value="ARCHIVED">Archived</option>
        </FilterSelect>
        <FilterSelect name="deadline" defaultValue={deadline} label="Deadline">
          <option value="">Any deadline</option>
          <option value="soon">Within 7 days</option>
          <option value="future">Future deadlines</option>
          <option value="expired">Expired</option>
          <option value="none">Not listed</option>
        </FilterSelect>
        <FilterSelect name="link" defaultValue={link} label="Job link">
          <option value="">Any link status</option>
          <option value="available">Direct link available</option>
        </FilterSelect>
        <FilterSelect name="sort" defaultValue={sort} label="Sort by">
          <option value="newest">Newest collected</option>
          <option value="deadline">Nearest deadline</option>
          <option value="company">Company A–Z</option>
        </FilterSelect>
      </div>

      <div className="job-filter-actions">
        <Link href="/jobs" className="btn-secondary">Clear all</Link>
        <button className="btn-primary" type="submit"><Filter size={16} /> Show matching jobs</button>
      </div>
    </form>
  );
}

function FilterSelect({ name, defaultValue, label, children }: { name: string; defaultValue: string; label: string; children: React.ReactNode }) {
  return <label className="job-filter-field"><span>{label}</span><select className="input" name={name} defaultValue={defaultValue}>{children}</select></label>;
}
