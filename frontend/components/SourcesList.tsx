import { Source } from "@/lib/api";
import { ExternalLink } from "lucide-react";

interface SourcesListProps {
  sources: Source[];
}

export default function SourcesList({ sources }: SourcesListProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-8 border-t border-zinc-700 pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400 mb-3">
        Fonti originali
      </h2>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="flex items-center gap-2 text-sm">
            <ExternalLink size={14} className="text-zinc-500 shrink-0" />
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 hover:underline truncate"
            >
              {source.domain || source.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
