import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — FoxScan",
  description: "Informativa sul trattamento dei dati personali di FoxScan ai sensi del Regolamento UE 2016/679 (GDPR).",
};

const SECTION = "mb-8";
const H2 = "text-lg font-bold text-[#0B1F3A] dark:text-slate-100 mb-3 font-grotesk";
const P = "text-sm text-gray-600 dark:text-slate-400 leading-relaxed mb-3";
const UL = "list-disc list-inside space-y-1.5 text-sm text-gray-600 dark:text-slate-400 mb-3 ml-1";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto fade-up py-4">

      {/* Header */}
      <div className="mb-10">
        <Link href="/" className="text-sm text-blue-600 dark:text-[#00FFE5] hover:underline">
          ← Torna alla homepage
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#0B1F3A] dark:text-slate-100 mt-4 mb-2 font-grotesk">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 dark:text-slate-500">
          Ai sensi del Regolamento UE 2016/679 (GDPR) — Ultimo aggiornamento: marzo 2026
        </p>
      </div>

      {/* 1 */}
      <div className={SECTION}>
        <h2 className={H2}>1. Titolare del trattamento</h2>
        <p className={P}>
          Il titolare del trattamento dei dati personali è <strong>FoxScan</strong> (progetto personale).
          Per qualsiasi richiesta relativa alla privacy puoi usare il{" "}
          <Link href="/contact" className="text-blue-600 dark:text-[#00FFE5] hover:underline">
            modulo di contatto
          </Link>
        </p>
      </div>

      {/* 2 */}
      <div className={SECTION}>
        <h2 className={H2}>2. Dati raccolti e finalità</h2>
        <p className={P}>
          FoxScan è un servizio di lettura: non richiede registrazione, non raccoglie dati personali
          in modo attivo e non utilizza cookie di profilazione.
        </p>
        <p className={P}>
          Le uniche informazioni trattate sono quelle generate automaticamente dai server di
          hosting (Vercel per il frontend, Render per il backend) durante la normale navigazione:
        </p>
        <ul className={UL}>
          <li>Indirizzo IP del visitatore</li>
          <li>Data, ora e pagina richiesta</li>
          <li>Browser e sistema operativo (user-agent)</li>
        </ul>
        <p className={P}>
          Questi dati sono gestiti esclusivamente dai provider di hosting e non sono accessibili
          direttamente da FoxScan, né vengono ceduti a terzi per scopi commerciali.
        </p>
      </div>

      {/* 3 */}
      <div className={SECTION}>
        <h2 className={H2}>3. Base giuridica del trattamento</h2>
        <p className={P}>
          Il trattamento dei dati di navigazione si basa sul legittimo interesse del titolare
          (Art. 6(1)(f) GDPR) per garantire la sicurezza e il corretto funzionamento del servizio.
        </p>
      </div>

      {/* 4 */}
      <div id="cookie" className={SECTION}>
        <h2 className={H2}>4. Cookie e archiviazione locale</h2>
        <p className={P}>
          FoxScan <strong>non utilizza cookie di profilazione né cookie di tracciamento</strong>.
        </p>
        <p className={P}>
          Viene utilizzato esclusivamente il <strong>localStorage</strong> del browser (non un cookie)
          per memorizzare la preferenza del tema (chiaro/scuro) scelta dall&apos;utente. Questo dato
          rimane sul dispositivo dell&apos;utente e non viene mai trasmesso a server esterni.
        </p>
        <p className={P}>
          Puoi cancellare questa preferenza in qualsiasi momento svuotando i dati del sito nelle
          impostazioni del browser.
        </p>
      </div>

      {/* 5 */}
      <div className={SECTION}>
        <h2 className={H2}>5. Trasferimento dati extra-UE</h2>
        <p className={P}>
          I dati di navigazione sono gestiti da:
        </p>
        <ul className={UL}>
          <li>
            <strong>Vercel Inc.</strong> (USA) — hosting frontend. Trattamento basato su Standard
            Contractual Clauses (SCC) ai sensi dell&apos;Art. 46 GDPR.
          </li>
          <li>
            <strong>Render Services Inc.</strong> (USA) — hosting backend. Trattamento basato su SCC.
          </li>
        </ul>
        <p className={P}>
          Entrambi i provider sono conformi alle normative vigenti in materia di trasferimento
          internazionale di dati personali.
        </p>
      </div>

      {/* 6 */}
      <div className={SECTION}>
        <h2 className={H2}>6. Conservazione dei dati</h2>
        <p className={P}>
          I log tecnici sono conservati dai provider di hosting per il tempo strettamente necessario
          a garantire la sicurezza del servizio, generalmente non superiore a 30 giorni, salvo
          obblighi di legge.
        </p>
      </div>

      {/* 7 */}
      <div className={SECTION}>
        <h2 className={H2}>7. Diritti dell&apos;interessato</h2>
        <p className={P}>
          Ai sensi degli articoli 15–22 del GDPR, hai il diritto di:
        </p>
        <ul className={UL}>
          <li><strong>Accesso</strong> — ottenere conferma del trattamento e copia dei dati</li>
          <li><strong>Rettifica</strong> — correggere dati inesatti</li>
          <li><strong>Cancellazione</strong> — richiedere la cancellazione (&quot;diritto all&apos;oblio&quot;)</li>
          <li><strong>Limitazione</strong> — limitare il trattamento in determinati casi</li>
          <li><strong>Portabilità</strong> — ricevere i dati in formato strutturato</li>
          <li><strong>Opposizione</strong> — opporti al trattamento basato su legittimo interesse</li>
        </ul>
        <p className={P}>
          Per esercitare i tuoi diritti usa il{" "}
          <Link href="/contact" className="text-blue-600 dark:text-[#00FFE5] hover:underline">
            modulo di contatto
          </Link>.
          Hai inoltre il diritto di proporre reclamo al{" "}
          <a
            href="https://www.garanteprivacy.it"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-[#00FFE5] hover:underline"
          >
            Garante per la protezione dei dati personali
          </a>.
        </p>
      </div>

      {/* 8 */}
      <div id="disclaimer" className={SECTION}>
        <h2 className={H2}>8. Disclaimer sui contenuti</h2>
        <p className={P}>
          Gli articoli pubblicati su FoxScan sono <strong>sintesi generate da intelligenza
          artificiale</strong> (modello LLaMA 3.3 via API Groq) a partire da articoli originali
          di terze parti. Le fonti originali sono sempre citate all&apos;interno di ogni articolo.
        </p>
        <p className={P}>
          FoxScan non garantisce l&apos;accuratezza assoluta delle sintesi AI e declina ogni responsabilità
          per decisioni prese sulla base delle informazioni pubblicate. I contenuti hanno scopo
          puramente informativo e <strong>non costituiscono consulenza professionale</strong> di
          sicurezza informatica, legale o di altro tipo.
        </p>
        <p className={P}>
          I diritti sui contenuti originali appartengono ai rispettivi editori. FoxScan opera nel
          rispetto del fair use a scopo informativo e non commerciale, citando sempre le fonti.
        </p>
      </div>

      {/* 9 */}
      <div className={SECTION}>
        <h2 className={H2}>9. Modifiche alla presente policy</h2>
        <p className={P}>
          FoxScan si riserva il diritto di aggiornare questa informativa. Le modifiche saranno
          pubblicate su questa pagina con indicazione della data di aggiornamento.
        </p>
      </div>

      <div className="pt-6 border-t border-blue-100 dark:border-white/8">
        <p className="text-xs text-gray-400 dark:text-slate-600">
          © 2026 FoxScan · Regolamento UE 2016/679 (GDPR)
        </p>
      </div>
    </div>
  );
}
