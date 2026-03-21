import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-7xl font-bold text-cyan-400 mb-4">404</p>
      <h1 className="text-2xl font-semibold text-white mb-2">Pagina non trovata</h1>
      <p className="text-zinc-400 mb-8">
        L&apos;articolo o la pagina che cerchi non esiste o è stata rimossa.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
      >
        Torna alla homepage
      </Link>
    </div>
  );
}
