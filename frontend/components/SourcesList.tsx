import { Source } from "@/lib/api";
import { ExternalLink } from "lucide-react";

interface SourcesListProps {
  sources: Source[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  if (!sources.length) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">
        Fonti originali
      </h2>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="flex items-center gap-2 text-sm">
            <ExternalLink size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline truncate"
            >
              {source.domain || source.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
