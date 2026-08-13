# PuliGo

PuliGo è un'applicazione web per la gestione operativa delle imprese di pulizie.

L'applicazione permette di gestire:

- Appalti
- Dipendenti
- Turni
- Assegnazione del personale
- Copertura dei servizi
- Statistiche e riepiloghi
- Costi del personale
- Utenti e ruoli
- Amministrazione
- Dati operativi aziendali

---

## Tecnologie utilizzate

### Frontend

- **React 18** — libreria principale per l'interfaccia utente
- **JavaScript / JSX** — linguaggio principale dell'applicazione
- **Vite 6** — build tool e development server
- **Tailwind CSS 3** — framework CSS per l'interfaccia grafica
- **React Router DOM** — gestione della navigazione
- **Lucide React** — libreria di icone
- **Recharts** — grafici e statistiche
- **Framer Motion** — animazioni
- **React Hook Form** — gestione dei moduli
- **Zod** — validazione dei dati
- **date-fns / Moment.js** — gestione delle date
- **XLSX** — esportazione dei dati in Excel
- **jsPDF** — generazione di documenti PDF
- **html2canvas** — conversione di elementi HTML in immagini
- **React Leaflet** — mappe
- **React Markdown** — gestione dei contenuti Markdown

### Backend e database

- **Supabase** — backend-as-a-service
- **PostgreSQL** — database relazionale
- **Supabase Auth** — autenticazione degli utenti
- **Supabase Data API** — accesso ai dati tramite API
- **Row Level Security (RLS)** — gestione dei permessi di accesso ai dati

### Repository e deployment

- **GitHub** — repository e versionamento del codice
- **Vercel** — hosting e deployment dell'applicazione
- **Node.js** — ambiente di esecuzione
- **npm** — gestione delle dipendenze

### Linguaggi

- **JavaScript**
- **JSX**
- **HTML5**
- **CSS**
- **Tailwind CSS**
- **JSON**
- **JSONB** per dati strutturati nel database PostgreSQL

> TypeScript è presente tra le dipendenze di sviluppo del progetto, ma l'applicazione attuale è principalmente sviluppata in JavaScript/JSX.

---

## Architettura

L'attuale infrastruttura di PuliGo è composta da:

```text
                 ┌──────────────┐
                 │    VS Code   │
                 │  sviluppo    │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    GitHub    │
                 │  repository  │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    Vercel    │
                 │   hosting    │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    PuliGo    │
                 │     Web App  │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   Supabase   │
                 │ Auth + DB    │
                 └──────────────┘
