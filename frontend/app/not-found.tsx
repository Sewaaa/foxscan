import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4 fade-up">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/error_nobg.png" alt="" className="w-32 h-32 object-contain mb-6 opacity-80 float-anim" />
      <p className="text-7xl font-bold text-blue-600 dark:text-cyan-400 mb-3 font-grotesk">{t("code")}</p>
      <h1 className="text-xl font-semibold text-[#0B1F3A] dark:text-white mb-2">{t("title")}</h1>
      <p className="text-gray-500 dark:text-zinc-400 mb-8 max-w-sm text-sm">
        {t("description")}
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 bg-[#0B1F3A] dark:bg-cyan-600 hover:bg-blue-700 dark:hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
      >
        {t("back")}
      </Link>
    </div>
  );
}
