"use client";

import { useMemo, useState } from "react";

const sizes = {
  sm: "company-avatar-sm",
  md: "company-avatar-md",
  lg: "company-avatar-lg"
};

function initials(company: string) {
  return company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "JP";
}

export default function CompanyAvatar({ company, size = "md", url }: { company: string; size?: keyof typeof sizes; url?: string | null }) {
  const [imageFailed, setImageFailed] = useState(false);
  const iconUrl = useMemo(() => {
    if (!url) return null;
    try {
      return `${new URL(url).origin}/favicon.ico`;
    } catch {
      return null;
    }
  }, [url]);

  return (
    <div className={`company-avatar ${sizes[size]}`} aria-label={`${company} logo`}>
      {iconUrl && !imageFailed ? (
        // A company/ATS favicon gives the tracker a visual identity while the
        // initials remain the reliable fallback for sites without one.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" className="h-[58%] w-[58%] rounded object-contain" onError={() => setImageFailed(true)} />
      ) : initials(company)}
    </div>
  );
}
