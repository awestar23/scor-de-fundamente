# Scor de Fundamente — brief de proiect

> Acest fișier e citit de Claude Code la fiecare sesiune. Nu-l șterge.
> Dacă metodologia se schimbă, se schimbă AICI întâi, apoi în cod.

---

## 1. Ce construim

O platformă în limba română care arată **cât de sănătos e un proiect crypto**, pe baza
datelor financiare on-chain verificabile publice.

**Promisiunea produsului:** "Înțelege ce deții."
**NU este:** "Găsește următorul 100x."

Utilizatorul introduce numele unui proiect și primește o analiză structurată pe mai multe
dimensiuni, cu explicația fiecărui punct și sursa datelor.

### Publicul țintă
Investitorul român semi-profesionist (portofoliu 1.000–10.000 EUR) care nu plătește
300$/lună pe Messari, dar vrea mai mult decât grupuri de Telegram. Începătorul e servit
gratuit — el aduce încrederea și recomandările.

---

## 2. Stack tehnic

| Componentă | Alegere | De ce |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | frontend + backend într-un singur proiect |
| Deploy | Vercel | tier gratuit, se leagă direct de GitHub |
| Bază de date | Supabase (Postgres) | tier gratuit, necesară pentru istoric |
| Cron zilnic | GitHub Actions | gratuit, rulează snapshot-ul |
| Stil | Tailwind CSS | rapid, fără decizii de design la fiecare pas |

**Backend-ul e obligatoriu**, nu opțional: browserul nu poate apela DefiLlama direct
(restricții CORS), iar cache-ul e necesar ca să nu depășim rate limit-ul.

---

## 3. Reguli critice — NU se încalcă

### 3.1 Limbaj neutru, fără recomandări
Produsul afișează **date și context**, niciodată sfaturi de investiție.

- ✅ „Venitul e peste 82% dintre protocoalele urmărite."
- ❌ „Proiect bun de cumpărat." / „Potențial de creștere." / săgeți verzi/roșii / „BUY"

Motivul e legal: un scor prezentat ca recomandare intră în zona de consultanță de
investiții reglementată (ESMA/MiFID). Poziționarea educațională ne protejează.
Fiecare pagină are un disclaimer vizibil.

### 3.2 Loghează DATE BRUTE zilnic, nu scoruri
Job-ul zilnic salvează în Supabase valorile brute (revenue, holders revenue, TVL, mcap,
fees). **Niciodată doar scorul final.**

Motivul: dacă schimbăm formula, scorurile vechi devin inutile și nu pot fi recalculate.
Datele brute se re-scorează oricând. Fiecare zi fără logging e pierdută definitiv.

Asta e prioritatea #1 în ordinea de construcție.

### 3.3 „Date Insuficiente" nu e același lucru cu „scor mic"
Dacă un proiect nu are date on-chain verificabile, **nu primește scor**. Primește o
etichetă gri, neutră:

> **Date insuficiente** — Acest proiect nu publică date on-chain verificabile pe care
> să le putem măsura. Nu putem calcula un scor.

Un scor de 10/100 dintr-o lipsă de date e o minciună și pierde încrederea utilizatorului.

### 3.4 Fee-urile protocolului ≠ bani pentru deținătorii de token
Asta e diferențiatorul principal al produsului. Arătăm mereu ambele cifre și procentul
de transfer către deținători (passthrough).

Exemplu real (iulie 2026):
- Uniswap: venit 4,99M$ → holderi 4,97M$ (~99%)
- Hyperliquid: venit 63,54M$ → holderi 58,93M$ (~93%)
- Pump: venit 25,73M$ → holderi 11,98M$ (~47%)
- Sky: venit 12,65M$ → holderi 1,12M$ (~9%)
- Aave: venit 5,23M$ → merge în trezorerie, **nu** la deținătorii AAVE

Educația asta lipsește complet retail-ului. E motivul pentru care produsul există.

---

## 4. Metodologia de scoring

### 4.1 Scor relativ (percentilă), nu praguri fixe
Pragurile fixe fac ca zeci de proiecte similare să primească aceeași notă. Fiecare metrică
se punctează prin **percentilă față de universul complet** de protocoale cu date.

`percentilă = (câte protocoale au valoare mai mică) / (total protocoale cu date)`

Dacă universul de comparație are sub 8 valori valide, percentila nu e fiabilă — se
returnează null și se marchează explicit, nu se inventează un scor.

### 4.2 Dimensiuni separate — NU un singur scor
Un scor unic („SOL 78/100") ascunde exact informația utilă. Un proiect poate fi
excelent ȘI supraevaluat simultan.

Afișăm întotdeauna defalcat:

| Dimensiune | Ce măsoară | Din ce se calculează |
|---|---|---|
| **Quality** | Cât de sănătos e protocolul: venit, tendință, scară, adopție | percentila venitului + tendința 7z/30z |
| **Economics** | Cât din venit ajunge efectiv la deținători (passthrough) | percentila raportului holders revenue / revenue |
| **Valuation** | Cât de scump e raportat la ce produce (P/S anualizat) | percentila logaritmică pe capitalizare / venit anualizat |
| **Risk** | Vechime, scară, diluție (concentrarea — faza 3) | media percentilelor de vechime, capitalizare și FDV/mcap |

Scorul general e o sinteză, dar **nu se afișează niciodată singur** — mereu cu defalcarea
alături.

### 4.3 Formule continue, nu trepte
- Venit, scară → percentilă (continuu, cu o zecimală)
- Valuation → logaritmic pe P/S, fără salturi bruște
- Tendință → liniar pe raportul (medie 7 zile / medie 30 zile)

### 4.4 Flag de risc pentru proiecte noi/mici
Nu detectăm clone la nivel de cod (ar cere analiză de bytecode — alt produs).
Folosim semnale de piață. Dacă bifează 2+ din:

- token lansat de sub 30 de zile
- lichiditate foarte mică
- concentrare mare în primele wallet-uri
- lipsă totală de fee-tracking

→ etichetă: **„Proiect nou — istoric insuficient pentru un scor de încredere."**

Stadiu (august 2026): trei din patru semnale sunt implementate gratuit.
- vechime → `listedAt` din DefiLlama (de când e urmărit public)
- scară / lichiditate → percentila capitalizării, din CoinGecko
- diluție → raportul FDV / capitalizare (cât supply n-a intrat încă în circulație)
- **concentrarea în primele wallet-uri lipsește** — cere Etherscan/Solscan per chain,
  rămâne în faza 3. Nu o aproximăm cu alt indicator.

**Proiectele slabe se etichetează, nu se ascund.** Nu filtrăm universul după capitalizare
sau după top-N: ar rupe percentilele de la 4.1 și ar contrazice teza produsului, fiindcă
am folosi tocmai capitalizarea — metrica pe care o punem sub semnul întrebării — drept
portar. Consecința ar fi că un proiect cu venit real, dar cu atenție mică de piață, n-ar
apărea niciodată; exact descoperirea cea mai valoroasă pe care o poate face instrumentul.
Filtrul pe fundamente există deja și e mai bun: fără venit măsurabil nu există scor (3.3).

### 4.5 Istoricul scorului
Cea mai valoroasă funcție. Arătăm evoluția în timp și **ce s-a schimbat**:

```
ETH  28 iul 2026 → 87
     28 apr 2026 → 82
Ce s-a schimbat: venit +23%, FDV +31%, valuation s-a deteriorat
```

Depinde direct de regula 3.2. Fără logging zilnic din prima zi, funcția asta nu poate
exista niciodată.

---

## 5. Surse de date

### 5.1 DefiLlama — sursa primară

**API public, gratuit, fără cheie.** Base: `https://api.llama.fi`
Rate limit: ~500 cereri / 5 minute. Cache obligatoriu.

| Endpoint | Ce dă |
|---|---|
| `/protocols` | toate protocoalele: TVL, mcap, categorie, chain-uri, `parentProtocol`, `gecko_id`, `listedAt` |
| `/config` | cei 800 de **proiecte-părinte**, într-o singură cerere (nume, simbol, `gecko_id`) |
| `/overview/fees` | fee-uri totale plătite de utilizatori |
| `/overview/fees?dataType=dailyRevenue` | venit reținut de protocol |
| `/overview/fees?dataType=dailyHoldersRevenue` | venit care ajunge la deținători |
| `/summary/fees/{slug}` | detaliu pe un singur protocol |

✅ Verificat live (august 2026): `dataType=dailyHoldersRevenue` e numele corect.

⚠️ Răspunsurile trec de 30 MB, peste limita de 2 MB a cache-ului de fetch din Next.js.
Se cache-uiește **rezultatul prelucrat** (`unstable_cache`), nu răspunsul brut.

### 5.2 Agregarea pe proiect-părinte

Uniswap V2/V3/V4 sunt **un singur proiect**, nu trei. Nu e cosmetică: token-ul UNI
capturează valoare din toate versiunile, deci P/S corect = capitalizare / venit **însumat**.
Capitalizarea nu se însumează niciodată (aceleași token), veniturile da.

Agregarea se face **la citire**. Snapshot-ul zilnic scrie rânduri brute per protocol, cu
`parent_protocol` alături — altfel detaliul per versiune s-ar pierde definitiv, exact ce
previne regula 3.2.

### 5.3 CoinGecko — îmbogățire

**API public, fără cheie obligatorie** (o cheie Demo gratuită e mai stabilă la rate limit;
se citește din `COINGECKO_API_KEY` dacă există). Endpoint: `/coins/markets`, 250 id-uri
per cerere → tot universul în 3 cereri.

Dă **capitalizarea și FDV**, mapate exact prin `gecko_id`-ul pe care DefiLlama îl ține deja.
Fără el, dimensiunea Evaluare era N/A aproape peste tot: la protocoalele-copil DefiLlama
nu raportează capitalizare. Acoperirea P/S a urcat de la 280 la 464 de proiecte.

De ce CoinGecko și nu CoinMarketCap: DefiLlama mapează 433 de părinți cu `gecko_id` față
de 297 cu `cmcId` (139 ar fi doar pe CoinGecko, 3 doar pe CMC), iar CMC cere cheie chiar
și gratuit — un secret în plus în Vercel și în GitHub Actions.

**E sursă secundară, nu primară.** Dacă pică, proiectele afectate rămân fără capitalizare
și Evaluarea iese „N/A" (regula 3.3), dar restul produsului merge. Eșecul se prinde în
`coingecko.ts`, nu se propagă.

**Nu plătim DefiLlama Pro (300$/lună) acum.** Tier-ul gratuit acoperă tot ce ne trebuie
pentru MVP. Se reevaluează la 30+ abonați.

**Risc rămas:** DefiLlama e în continuare singura sursă pentru venituri și fee-uri. Dacă
schimbă API-ul, partea de scoring se oprește. Un al doilea furnizor pentru venituri
rămâne în faza 3.

---

## 6. Ordinea de construcție

### Faza 1 — Fundația (prioritate absolută)
1. ✅ Setup Next.js + TypeScript + Tailwind
2. ✅ Schema Supabase pentru snapshot-uri zilnice — *scrisă; proiectul Supabase încă nu există*
3. ⏳ **Job-ul de snapshot zilnic** (GitHub Actions) — cod scris, **nu rulează încă**
4. ✅ Route API care preia și cache-uiește datele DefiLlama

### Faza 2 — Produsul vizibil
5. ✅ Căutare după nume de proiect (nume, simbol, slug)
6. ✅ Pagină de rezultat cu dimensiunile separate + explicația fiecărui punct
7. ✅ Categoria „Date insuficiente"
8. ✅ Comparație între 2–3 proiecte

### Faza 3 — Ce diferențiază (după validare)
9. Istoricul scorului + „ce s-a schimbat" — **blocat până pornește punctul 3**
10. ✅ Semnale de risc: vechime, scară, diluție (concentrarea rămâne)
11. Sursă secundară pentru **venituri** (CoinGecko acoperă deja capitalizarea)
12. Conturi, watchlist, alerte

⚠️ **Punctul 3 e singurul cu ceas.** Fiecare zi fără logare e o zi de istoric care nu se
mai poate recupera niciodată, iar funcția 9 — cea mai valoroasă — depinde integral de el.
Restul se poate construi oricând.

---

## 7. Ce NU facem

- ❌ Predicții de preț, ținte, semnale de trading
- ❌ Reclame sau conținut sponsorizat (subminează exact încrederea pe care o vindem)
- ❌ Analiză de bytecode / detecție de clone (alt produs)
- ❌ Scor unic afișat fără defalcare
- ❌ Optimizare prematură — validăm întâi că oamenii folosesc produsul

---

## 8. Convenții de cod

- TypeScript strict
- Toate valorile monetare în USD (sursa e în USD), afișate cu separator românesc
- Interfața și textele: **română**. Codul, variabilele, comentariile: **engleză**
- Fiecare funcție de scoring returnează `{ pts, max, note }` — `note` e explicația
  în română afișată utilizatorului
- Tratare de erori explicită: dacă lipsesc date, se spune clar, nu se inventează valori
  implicite
