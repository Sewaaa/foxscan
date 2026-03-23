"use client";

interface Props {
  size?: number; // px
  className?: string;
}

export default function ByteMascot({ size = 176, className = "" }: Props) {
  return (
    <div
      className={`relative float-anim ${className}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/byte-mascot.png"
        alt="Byte, la mascotte di CyberNews"
        className="w-full h-full object-contain drop-shadow-2xl"
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = "none";
          if (el.parentElement) {
            el.parentElement.innerHTML = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(6,230,217,0.15);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.45)}px;">👻</div>`;
          }
        }}
      />
      <div className="absolute inset-0 rounded-full bg-[#06E6D9] opacity-10 blur-3xl pointer-events-none" />
    </div>
  );
}
