"""
Script per inserire articoli demo nel database, utile per sviluppare il frontend
senza aspettare che la pipeline giri davvero.
Eseguire con: python seed_demo.py
"""
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, init_db
from models import Article, Source
from datetime import datetime, timedelta

DEMO_ARTICLES = [
    {
        "title": "Nuovo ransomware LockBit 4.0 colpisce ospedali europei",
        "summary": "Una nuova variante di LockBit ha compromesso sistemi ospedalieri in Germania, Francia e Italia, crittografando dati di pazienti e chiedendo riscatti fino a 5 milioni di euro.",
        "body": """## Attacco in corso

Una sofisticata campagna ransomware sta colpendo strutture sanitarie in tutta Europa. Il gruppo LockBit ha rilasciato una nuova variante del proprio malware, denominata internamente **LockBit 4.0**, che sfrutta una vulnerabilità zero-day nei sistemi di gestione ospedaliera.

## Tecnica di attacco

Gli analisti di BleepingComputer hanno identificato il vettore d'ingresso principale: una vulnerabilità non patchata in un sistema di cartelle cliniche elettroniche molto diffuso in Europa. Il malware si propaga lateralmente attraverso la rete interna prima di attivarsi.

## Impatto

- 12 ospedali colpiti in Germania
- 8 strutture in Francia
- 3 ospedali italiani, tra cui uno a Milano

## Raccomandazioni

Le autorità raccomandano di aggiornare immediatamente i sistemi di gestione ospedaliera e di isolare le reti critiche.""",
        "tags": ["ransomware", "malware"],
        "relevance_score": 9,
        "days_ago": 0,
        "sources": [
            ("https://www.bleepingcomputer.com/news/security/lockbit-hospitals/", "bleepingcomputer.com"),
            ("https://thehackernews.com/lockbit-4-hospitals", "thehackernews.com"),
        ],
    },
    {
        "title": "CVE-2024-12345: vulnerabilità critica in OpenSSH permette RCE senza autenticazione",
        "summary": "Una vulnerabilità critica (CVSS 9.8) in OpenSSH versioni 8.x e 9.x consente l'esecuzione di codice remoto senza autenticazione. Patch disponibile nella versione 9.9.",
        "body": """## Dettaglio della vulnerabilità

I ricercatori di Qualys hanno scoperto e divulgato responsabilmente una vulnerabilità critica in OpenSSH che consente a un attaccante remoto non autenticato di eseguire codice arbitrario sul sistema target.

## Versioni affette

- OpenSSH 8.5p1 fino a 9.8p1
- Tutte le distribuzioni Linux che utilizzano queste versioni

## Patch disponibile

La versione **9.9p1** include la correzione. Si raccomanda aggiornamento immediato.

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install openssh-server

# RHEL/CentOS
sudo dnf update openssh
```

## Workaround temporaneo

Limitare l'accesso SSH tramite firewall fino all'applicazione della patch.""",
        "tags": ["CVE", "vulnerability"],
        "relevance_score": 10,
        "days_ago": 1,
        "sources": [
            ("https://www.securityweek.com/openssh-cve-2024-12345/", "securityweek.com"),
            ("https://krebsonsecurity.com/openssh-rce/", "krebsonsecurity.com"),
            ("https://thehackernews.com/openssh-critical/", "thehackernews.com"),
        ],
    },
    {
        "title": "APT29 (Cozy Bear) lancia campagna di spear-phishing contro ministeri europei",
        "summary": "Il gruppo russo APT29 ha condotto una campagna mirata contro funzionari di governi europei, sfruttando documenti Word malevoli che sfruttano una macro zero-click.",
        "body": """## Nuova campagna APT29

I ricercatori di Mandiant hanno attribuito con alta confidenza una nuova campagna di spear-phishing al gruppo russo APT29, noto anche come Cozy Bear e collegato all'SVR (intelligence estera russa).

## Vettore di attacco

La campagna utilizza email di spear-phishing altamente personalizzate con allegati Word che contengono macro malevole. Il documento si presenta come una comunicazione ufficiale dell'UE.

## Obiettivi

- Ministeri degli esteri europei
- Ambasciate nella regione EMEA
- Think tank e centri di ricerca sulla politica estera

## Indicatori di compromissione (IoC)

I C2 server identificati operano su infrastruttura cloud compromessa in più paesi.

## Mitigazioni

- Disabilitare le macro Office per default
- Implementare DMARC, DKIM e SPF
- Formazione del personale sul riconoscimento di phishing""",
        "tags": ["APT", "phishing", "espionage"],
        "relevance_score": 8,
        "days_ago": 2,
        "sources": [
            ("https://www.darkreading.com/apt29-european-campaign/", "darkreading.com"),
            ("https://thehackernews.com/cozy-bear-2024/", "thehackernews.com"),
        ],
    },
    {
        "title": "Data breach: 50 milioni di record di utenti italiani in vendita sul dark web",
        "summary": "Un database contenente 50 milioni di record di utenti italiani, inclusi dati anagrafici e numeri di carta d'identità, è apparso in vendita su forum del dark web.",
        "body": """## Scoperta del leak

Un ricercatore di sicurezza che opera sotto lo pseudonimo @DataLeakWatch ha scoperto e segnalato la presenza di un database di grandi dimensioni in vendita su un forum frequentato da criminali informatici.

## Contenuto del database

Il database, della dimensione di circa 8GB compressa, contiene:

- Nome e cognome
- Codice fiscale
- Numero di carta d'identità o passaporto
- Indirizzo di residenza
- Numero di telefono
- Email

## Origine sconosciuta

L'origine del breach non è ancora stata identificata. Le ipotesi più accreditate puntano a un ente pubblico o a un grande provider di servizi finanziari.

## Cosa fare

Se sei un cittadino italiano, monitora i tuoi account finanziari e considera di attivare un'allerta frodi presso le banche.""",
        "tags": ["breach"],
        "relevance_score": 7,
        "days_ago": 3,
        "sources": [
            ("https://www.bleepingcomputer.com/italy-data-breach-50m/", "bleepingcomputer.com"),
        ],
    },
    {
        "title": "CISA rilascia KEV update: 15 nuove vulnerabilità sfruttate attivamente",
        "summary": "La CISA aggiorna il catalogo delle vulnerabilità note sfruttate (KEV) con 15 nuove voci, tra cui falle in Cisco IOS, Fortinet FortiOS e Microsoft Exchange.",
        "body": """## Aggiornamento KEV

La Cybersecurity and Infrastructure Security Agency (CISA) ha aggiornato il proprio catalogo delle Known Exploited Vulnerabilities con 15 nuove vulnerabilità.

## Vulnerabilità più critiche

### Cisco IOS XE (CVE-2024-20399)
Consente escalation di privilegi a livello root su dispositivi di rete Cisco. Sfruttata attivamente da più threat actor.

### Fortinet FortiOS (CVE-2024-21762)
Out-of-bounds write che consente RCE non autenticato su VPN SSL. Già utilizzata in attacchi ransomware.

### Microsoft Exchange (CVE-2024-49993)
Server-side request forgery che può portare a NTLM relay e compromissione dell'Active Directory.

## Scadenza per la remediation

Le agenzie federali USA hanno 21 giorni per applicare le patch. Si raccomanda la stessa urgenza per il settore privato.""",
        "tags": ["CVE", "vulnerability", "policy"],
        "relevance_score": 8,
        "days_ago": 4,
        "sources": [
            ("https://www.cisa.gov/known-exploited-vulnerabilities", "cisa.gov"),
            ("https://www.securityweek.com/cisa-kev-update/", "securityweek.com"),
            ("https://www.bleepingcomputer.com/cisa-15-new-kev/", "bleepingcomputer.com"),
        ],
    },
]


def seed():
    init_db()
    db = SessionLocal()

    try:
        existing = db.query(Article).count()
        if existing > 0:
            print(f"Database già contiene {existing} articoli. Seed saltato.")
            print("Per rifare il seed, svuota prima il database.")
            return

        for i, data in enumerate(DEMO_ARTICLES):
            published = datetime.utcnow() - timedelta(days=data["days_ago"], hours=i * 3)
            article = Article(
                title=data["title"],
                summary=data["summary"],
                body=data["body"],
                tags=json.dumps(data["tags"], ensure_ascii=False),
                relevance_score=data["relevance_score"],
                published_at=published,
            )
            db.add(article)
            db.flush()

            for url, domain in data["sources"]:
                source = Source(article_id=article.id, url=url, domain=domain)
                db.add(source)

        db.commit()
        print(f"Seed completato: {len(DEMO_ARTICLES)} articoli demo inseriti.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
