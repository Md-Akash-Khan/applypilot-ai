function splitItems(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[\t ]*[•●▪◦][\t ]*/g, "\n• ")
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "• ").trim())
    .filter(Boolean);
}

export default function StructuredJobText({ text, list = false }: { text: string; list?: boolean }) {
  const lines = splitItems(text);
  const bulletItems = lines.filter((line) => line.startsWith("• ")).map((line) => line.slice(2).trim());
  const prose = lines.filter((line) => !line.startsWith("• "));

  if (list || bulletItems.length) {
    const items = [...prose, ...bulletItems].filter(Boolean);
    return (
      <ul className="job-content-list">
        {items.map((item, index) => <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>)}
      </ul>
    );
  }

  return (
    <div className="job-content-prose">
      {prose.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
    </div>
  );
}

