"use client";

import { useTranslations } from "next-intl";

export type RelevanceLevel = 1 | 2 | 3;

export function getLevel(score: number): RelevanceLevel {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  return 1;
}

const LEVEL_CONFIG = {
  1: { key: "low",      dotColor: "bg-green-500",  textColor: "text-green-600"  },
  2: { key: "medium",   dotColor: "bg-orange-500", textColor: "text-orange-600" },
  3: { key: "critical", dotColor: "bg-red-500",    textColor: "text-red-600"    },
} as const;

interface Props {
  score: number;
  showLabel?: boolean;
}

export default function RelevanceDots({ score, showLabel = true }: Props) {
  const t = useTranslations("relevance");
  const level = getLevel(score);
  const { key, dotColor, textColor } = LEVEL_CONFIG[level];
  const label = t(key);

  return (
    <div className="flex items-center gap-1.5" title={`${score}/10`}>
      <div className="flex gap-0.5">
        {([1, 2, 3] as RelevanceLevel[]).map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i <= level ? dotColor : "bg-blue-100"}`}
          />
        ))}
      </div>
      {showLabel && (
        <span className={`text-xs font-medium ${textColor}`}>{label}</span>
      )}
    </div>
  );
}
