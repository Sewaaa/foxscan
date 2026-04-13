import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import BackendStatus from "@/components/BackendStatus";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FoxScan · Cybersecurity News",
  description: "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI in un unico articolo completo.",
  icons: {
    icon: "/icofs.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/icofs.ico",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "FoxScan · Cybersecurity News",
    description: "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI in un unico articolo completo.",
    url: "https://foxscan.vercel.app",
    siteName: "FoxScan",
    images: [{ url: "https://foxscan.vercel.app/testa_nobg.png", width: 512, height: 512 }],
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FoxScan · Cybersecurity News",
    description: "Le notizie di cybersecurity più rilevanti, sintetizzate automaticamente da AI.",
    images: ["https://foxscan.vercel.app/testa_nobg.png"],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: "footer" });

  return (
    <html lang={locale}>
      <head>
        <link rel="preload" href="/testa_nobg.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-[#F0F4FF] dark:bg-[#020817] text-[#0B1F3A] dark:text-slate-200 min-h-screen relative`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AnimatedBackground />
          <PWAInstallPrompt />
          <BackendStatus />
          <Header />

          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            {children}
          </main>

          <footer className="relative z-10 mt-16 md:mt-24 border-t border-blue-100 dark:border-white/5 bg-white dark:bg-transparent overflow-hidden">
            <div className="absolute inset-0 cyber-grid-bg dark:opacity-100 opacity-0 pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 md:pt-14 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-10 mb-8 md:mb-10">

                {/* Brand */}
                <div className="col-span-2 sm:col-span-1">
                  <div className="mb-3 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/testa_nobg.png" alt="" className="h-9 w-9 object-contain neon-glow-logo" />
                    <span className="font-extrabold text-xl tracking-tight font-grotesk">
                      <span className="text-[#0B1F3A] dark:text-white">Fox</span>
                      <span className="text-blue-600 dark:text-[#00FFE5]">Scan</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-500 leading-relaxed mb-3">
                    {t("tagline")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] text-gray-400 dark:text-[#00FFE5]/40 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-[#00FFE5]/10 bg-blue-50 dark:bg-transparent">
                      {t("aiPowered")}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-slate-600 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-white/5 bg-blue-50 dark:bg-transparent">
                      {t("openSource")}
                    </span>
                  </div>
                </div>

                {/* Categorie */}
                <div>
                  <h4 className="font-grotesk font-semibold text-[#0B1F3A] dark:text-slate-400 mb-3 text-xs uppercase tracking-widest">
                    {t("categories")}
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-500">
                    {[
                      ["/category/malware",       "Malware"],
                      ["/category/ransomware",    "Ransomware"],
                      ["/category/breach",        "Data Breach"],
                      ["/category/CVE",           "CVE"],
                      ["/category/vulnerability", "Vulnerability"],
                      ["/category/APT",           "APT"],
                    ].map(([href, label]) => (
                      <li key={href}>
                        <Link href={href} className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Piattaforma */}
                <div>
                  <h4 className="font-grotesk font-semibold text-[#0B1F3A] dark:text-slate-400 mb-3 text-xs uppercase tracking-widest">
                    {t("platform")}
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-500">
                    <li><Link href="/" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("home")}</Link></li>
                    <li><Link href="/about" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("about")}</Link></li>
                    <li><Link href="/rss" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("rss")}</Link></li>
                    <li><Link href="/contact" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("contact")}</Link></li>
                  </ul>
                </div>

                {/* Legale */}
                <div>
                  <h4 className="font-grotesk font-semibold text-[#0B1F3A] dark:text-slate-400 mb-3 text-xs uppercase tracking-widest">
                    {t("legal")}
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-slate-500">
                    <li><Link href="/privacy" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("privacyPolicy")}</Link></li>
                    <li><Link href="/privacy#cookie" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("cookiePolicy")}</Link></li>
                    <li><Link href="/privacy#disclaimer" className="hover:text-blue-600 dark:hover:text-[#00FFE5] transition-colors">{t("aiDisclaimer")}</Link></li>
                  </ul>
                  <p className="mt-3 text-[11px] text-gray-400 dark:text-slate-600 leading-relaxed">
                    {t("noCookies")}
                  </p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="py-4 border-t border-b border-blue-100 dark:border-white/5 mb-5">
                <p className="text-[11px] text-gray-400 dark:text-slate-600 leading-relaxed text-center">
                  {t("disclaimer")}
                </p>
              </div>

              {/* Bottom bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-xs text-gray-400 dark:text-slate-600">{t("copyright")}</p>
                <p className="text-xs text-gray-400 dark:text-slate-600">{t("gdpr")}</p>
              </div>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
