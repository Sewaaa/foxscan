import Link from "next/link";

const TAG_COLORS: Record<string, string> = {
  malware: "bg-red-900 text-red-200",
  ransomware: "bg-orange-900 text-orange-200",
  breach: "bg-yellow-900 text-yellow-200",
  CVE: "bg-purple-900 text-purple-200",
  APT: "bg-pink-900 text-pink-200",
  policy: "bg-blue-900 text-blue-200",
  tool: "bg-green-900 text-green-200",
  phishing: "bg-amber-900 text-amber-200",
  vulnerability: "bg-rose-900 text-rose-200",
  espionage: "bg-indigo-900 text-indigo-200",
};

const DEFAULT_COLOR = "bg-zinc-700 text-zinc-300";

interface TagBadgeProps {
  tag: string;
  linked?: boolean;
}

export default function TagBadge({ tag, linked = true }: TagBadgeProps) {
  const color = TAG_COLORS[tag] ?? DEFAULT_COLOR;
  const cls = `inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`;

  if (linked) {
    return (
      <Link href={`/category/${encodeURIComponent(tag)}`} className={cls}>
        {tag}
      </Link>
    );
  }
  return <span className={cls}>{tag}</span>;
}
