# CSV Manager

Applicazione full-stack per il caricamento, la visualizzazione e la gestione di file CSV con autenticazione utenti e permessi granulari.

## Stack Tecnologico

- **Frontend**: Angular 21 (standalone components, signals, control flow @if/@for)
- **Backend**: Fastify 5 (TypeScript, plugin architecture)
- **Database**: MongoDB 7 (Mongoose ODM)
- **Styling**: TailwindCSS 4 + DaisyUI + @ng-select/ng-select
- **State Management**: NgRx Signal Store
- **Auth**: JWT (@fastify/jwt)
- **Container**: Docker + Docker Compose

## Avvio rapido con Docker

```bash
# Clona il repository e posizionati nella directory
cd test-elai

# Avvia tutti i servizi
docker-compose up --build

# L'applicazione sarà disponibile su:
# - Frontend: http://localhost:4200
# - Backend API: http://localhost:3000
# - MongoDB: localhost:27017
```

## Avvio in sviluppo (senza Docker)

### Prerequisiti

- Node.js 20+
- MongoDB 7 (in esecuzione locale su porta 27017)

### Backend

```bash
cd backend
npm install
npm run dev
```

Il backend sarà disponibile su `http://localhost:3000`.

### Frontend

```bash
cd frontend
npm install
npm start
```

Il frontend sarà disponibile su `http://localhost:4200` con proxy automatico verso il backend.

## Scelte Architetturali

### Upload di file grandi (fino a 20GB)

L'upload è implementato interamente in streaming per evitare di caricare il file in memoria:

- **Frontend**: utilizza `HttpRequest` con `reportProgress: true` per mostrare una progress bar in tempo reale. Non viene utilizzata la fetch API (`withFetch()`) perché non supporta eventi di progresso upload.
- **Nginx**: configurato con `client_max_body_size 0` (nessun limite) e `proxy_request_buffering off` per non bufferizzare il file prima di inoltrarlo al backend.
- **Backend**: usa `@fastify/multipart` con `pipeline()` di Node.js per scrivere lo stream direttamente su disco senza buffering in memoria.
- **Storage**: i file vengono salvati su filesystem (non GridFS) per prestazioni ottimali su file di grandi dimensioni. La directory `uploads/` è montata come volume Docker.

### Anteprima e suggerimento tipi colonna

- Dopo l'upload, vengono parsate solo le prime N righe (default: 100) del CSV per generare l'anteprima.
- Il conteggio totale delle righe avviene in background (asincrono) per non bloccare la risposta all'upload.
- L'algoritmo di suggerimento tipi analizza i valori delle prime N righe per ogni colonna:
  - Prova a parsare come **number** (parseFloat + isFinite)
  - Prova a parsare come **date** (pattern regex + Date.parse)
  - Se >= 80% dei valori sono validi per un tipo, viene suggerito quel tipo
  - Default: **text**

### Autenticazione e Permessi

- JWT con scadenza 7 giorni, salvato in localStorage
- Interceptor Angular funzionale aggiunge automaticamente l'header Authorization
- Guard funzionale protegge le rotte private
- Il primo utente registrato riceve automaticamente tutti i permessi
- Quattro permessi disponibili (array nel documento utente):
  - `view_all`: visualizza file di tutti gli utenti
  - `delete_all`: elimina file di tutti gli utenti
  - `edit_all`: modifica tipi colonna di file di tutti gli utenti
  - `manage_users`: accede alla gestione utenti e permessi
- Senza permessi, l'utente vede/modifica/elimina solo i propri file
- Pannello di gestione utenti (richiede `manage_users`): CRUD profili, assegnazione permessi, eliminazione utenti con cleanup automatico dei file associati. Protezione contro auto-rimozione del permesso `manage_users` e auto-eliminazione

### Struttura Frontend (Angular 21)

- **Standalone components**: nessun NgModule, ogni componente dichiara i propri imports
- **NgRx Signal Store**: stato applicativo centralizzato in store dedicati (`AuthStore`, `FilesStore`, `UsersStore`) con `signalStore`, `withState`, `withComputed`, `withMethods`
- **Pattern store + service**: i service HTTP gestiscono solo le chiamate API, gli store gestiscono stato e logica applicativa, i componenti consumano gli store
- **Control flow**: `@if`, `@for`, `@switch` invece di direttive strutturali
- **Functional guards/interceptors**: approccio funzionale, senza classi
- **Lazy loading**: ogni feature viene caricata on-demand via `loadComponent()`
- **ng-select**: dropdown per la selezione del tipo di colonna

### Struttura Backend (Fastify 5)

- **Plugin pattern**: database, auth, CORS registrati come plugin Fastify
- **Separazione**: routes -> services -> models
- **Error handling**: error handler centralizzato con status code personalizzati
- **Validazione**: JSON Schema integrato nelle rotte Fastify

### Schema MongoDB

Due collection principali:

- **users**: email, password (bcrypt), name, permissions[]
- **files**: originalName, storedName (UUID), filePath, fileSize, uploadedBy (ref), columns[], previewData, rowCount

Le colonne sono un sotto-documento embedded (non una collection separata) perché vengono sempre lette insieme al file e il loro numero è limitato.

## API Endpoints

| Metodo | Endpoint                   | Auth | Descrizione                           |
| ------ | -------------------------- | ---- | ------------------------------------- |
| POST   | /api/auth/register         | No   | Registrazione utente                  |
| POST   | /api/auth/login            | No   | Login, ritorna JWT                    |
| GET    | /api/auth/me               | Si   | Profilo utente corrente               |
| POST   | /api/files/upload          | Si   | Upload CSV (multipart stream)         |
| GET    | /api/files                 | Si   | Lista file (filtrata per permessi)    |
| GET    | /api/files/:id             | Si   | Dettaglio file + preview + colonne    |
| PUT    | /api/files/:id/columns     | Si   | Aggiorna tipi colonna                 |
| DELETE | /api/files/:id             | Si   | Elimina file                          |
| GET    | /api/users                 | Si\* | Lista tutti gli utenti                |
| GET    | /api/users/:id             | Si\* | Dettaglio utente                      |
| PUT    | /api/users/:id             | Si\* | Aggiorna profilo utente (nome, email) |
| PUT    | /api/users/:id/permissions | Si\* | Aggiorna permessi utente              |
| DELETE | /api/users/:id             | Si\* | Elimina utente e relativi file        |

\* Richiede permesso `manage_users`

## Limitazioni e Assunzioni

1. **Formato CSV**: il parser assume che il file CSV abbia una riga di intestazione. Il separatore è la virgola (`,`). Per file con separatori diversi (`;`, `\t`) sarebbe necessario estendere il parser.

2. **Encoding**: il parser usa UTF-8 di default. File con encoding diversi potrebbero non essere letti correttamente.

3. **Timeout upload file molto grandi**: per file superiori a 10-15GB su connessioni lente, l'upload potrebbe richiedere molto tempo. Nginx è configurato con timeout di 3600 secondi. Un'evoluzione futura potrebbe implementare upload resumable (chunked).

4. **Conteggio righe**: per file molto grandi, il conteggio totale delle righe avviene in background. La UI inizialmente mostra il numero di righe della preview. Un refresh della pagina dopo alcuni minuti mostrerà il conteggio completo.

5. **Gestione permessi**: i permessi sono gestiti come array di stringhe nel documento utente. Il pannello di amministrazione (`/users`) permette di gestirli tramite UI, ma richiede il permesso `manage_users`. Il primo utente registrato riceve automaticamente tutti i permessi; gli utenti successivi partono senza permessi e devono essere abilitati da un amministratore.

6. **Sicurezza JWT**: il secret JWT è configurato via variabile d'ambiente. In produzione deve essere un valore forte e unico. Il token non implementa refresh token; scade dopo 7 giorni.

7. **Scalabilità**: l'applicazione è progettata per un singolo server. Per scenari multi-nodo, lo storage dei file dovrebbe essere migrato su un sistema distribuito (es. S3) e il bilanciamento dei permessi gestito tramite un API gateway.

## Struttura del Progetto

```
test-elai/
├── docker-compose.yml             # Orchestrazione servizi
├── .env.example                   # Template variabili d'ambiente
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── index.ts                # Entry point
│   │   ├── app.ts                  # Factory Fastify
│   │   ├── config/                 # Configurazione
│   │   ├── types/                  # Tipi TypeScript
│   │   ├── plugins/                # Plugin Fastify (DB, Auth, CORS)
│   │   ├── models/                 # Schema Mongoose
│   │   ├── services/               # Logica di business
│   │   ├── middleware/             # Helper permessi
│   │   └── routes/                 # Endpoint API
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf                  # Config Nginx per produzione
│   ├── proxy.conf.json             # Proxy per sviluppo
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── services/       # Service HTTP (file, user)
│   │   │   │   ├── store/          # NgRx Signal Store (auth, files, users)
│   │   │   │   ├── guards/         # Auth guard funzionale
│   │   │   │   ├── interceptors/   # Auth interceptor
│   │   │   │   └── utils/          # Utility (http-error)
│   │   │   ├── features/           # Componenti pagina (auth, dashboard, file-detail, users)
│   │   │   └── shared/             # Componenti riutilizzabili (upload, preview)
└── uploads/                        # File caricati (volume Docker)
```
