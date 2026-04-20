# DirectorCockpit — Frontend-Architektur

## Überblick

Single-Page-App zur Steuerung von Teams, Initiativen und Merkliste ("Nicht vergessen"). Vanilla JavaScript mit ES6-Modulen, kein Build-Step nötig.

## Setup

```bash
# PHP-Backend (Symfony)
composer install
make up              # Docker Compose
make backup          # PostgreSQL-Dump nach backups/backup-yy-mm-dd.sql schreiben

# JavaScript-Tooling (Entwicklung)
npm install
npm test             # Vitest-Tests ausführen
npm run test:watch   # Tests im Watch-Modus
npm run lint         # ESLint prüfen
npm run format       # Prettier formatieren
```

## Authentifizierung

DirectorCockpit verwendet Session-basierte Authentifizierung (Symfony Security).

### Erster Admin-Benutzer anlegen

```bash
make create-admin
# → Fragt interaktiv nach E-Mail und Passwort
# Oder direkt:
docker compose exec app php bin/console app:create-admin --email admin@example.com --password 'MeinSicheresPasswort!1'
```

### Passwort-Anforderungen

- Mindestens 12 Zeichen
- Mindestens ein Großbuchstabe (A–Z)
- Mindestens ein Kleinbuchstabe (a–z)
- Mindestens eine Ziffer (0–9)
- Mindestens ein Sonderzeichen

### Rollen

| Rolle | Berechtigungen |
|-------|---------------|
| `ROLE_USER` | Lesen und Schreiben aller Cockpit-Daten |
| `ROLE_ADMIN` | Zusätzlich: Benutzerverwaltung (Benutzer anlegen, Rollen ändern, löschen) |

### Seiten

- `/login.html` — Login-Formular
- `/admin.html` — Benutzerverwaltung (nur ROLE_ADMIN)
- `/cockpit.html`, `/kunden.html`, `/roadmap.html` — Erfordern Login (ROLE_USER)

### API-Endpunkte

| Endpunkt | Methode | Zugriff | Beschreibung |
|----------|---------|---------|--------------|
| `/api/login` | POST | Öffentlich | JSON-Login (email + password) |
| `/api/logout` | POST | Eingeloggt | Session beenden |
| `/api/me` | GET | ROLE_USER | Aktueller Benutzer |
| `/api/user/password` | PUT | ROLE_USER | Passwort ändern |
| `/api/admin/users` | GET/POST | ROLE_ADMIN | Benutzerliste / Neuen Benutzer anlegen |
| `/api/admin/users/{id}` | PUT/DELETE | ROLE_ADMIN | Rollen ändern / Benutzer löschen |

## Modul-Architektur

```
cockpit.html
  └─ cockpit.js          (Entry Point: load → restore → render → bind)
       │
       ├─ store.js        Zustand: data-Objekt, load(), save(), dSave()
       ├─ config.js       Konstanten: API_URL, Status-Enums, Entity-Definitionen
       ├─ utils.js        Pure Helpers: esc(), calcWsjf(), findById(), debounce()
       ├─ cookie.js       View-State Persistenz (Filter + Sort → Cookie)
       ├─ sort.js         Filter- & Sort-Logik für Initiativen
       ├─ crud.js         CRUD-Operationen: addEntity, removeEntity, cycleStatus
       ├─ render.js       DOM-Rendering: Teams, Initiativen, Nicht-vergessen
       ├─ detail.js       Initiative-Detail-Modal
       ├─ events.js       Event-Delegation & Handler-Registrierung
       └─ io.js           JSON Import/Export mit Datenmigration
```

### Dependency-Graph

```
config.js ◄── store.js ◄── crud.js ◄── events.js
    ▲             ▲           ▲            ▲
    │             │           │            │
    ├── sort.js ──┘           │            ├── io.js
    │     ▲                   │            ├── detail.js
    │     │                   │            └── cookie.js
    └── render.js ────────────┘
              ▲
              │
        utils.js (esc, calcWsjf, findById, debounce)
```

## Datenfluss

1. **Load:** `store.load()` → Fetch `/api/cockpit` → `setData()` → stabile Referenz
2. **Render:** `render.renderAll()` → liest `data` direkt → generiert DOM
3. **Edit:** Event-Handler → mutiert `data[source][id][field]` → `dSave()` (400ms Debounce)
4. **Save:** `save()` → PUT `/api/cockpit` → Queue bei Concurrent Saves
5. **View State:** Filter/Sort → Cookie (365 Tage) → Restore bei Page Load

## Datenmodell

```javascript
data = {
  kw: "12",                    // Kalenderwoche
  teams: [
    { id, name, sub, status, fokus, schritt }
  ],
  initiatives: [
    { id, name, team, status, projektstatus, schritt, frist, notiz,
      businessValue, timeCriticality, riskReduction, jobSize }
  ],
  nicht_vergessen: [
    { id, title, body }
  ]
}
```

## Tests

```
tests/js/
  ├── utils.test.js    23 Tests — esc, calcWsjf, findById, debounce
  ├── sort.test.js     28 Tests — Filter, Sort, applyViewState, sortInis
  ├── io.test.js       14 Tests — migrateData (Schlüssel-Migration, Defaults)
  └── store.test.js     9 Tests — setData, load-Fallback, save-Queue
                       ──
                       74 Tests gesamt
```

## Konventionen

- **camelCase** für Funktionen und Variablen
- **UPPER_CASE** für Konstanten (`CONFIG`, `STATUSES`, `ENTITY_DEFS`)
- **ESLint** (recommended + prettier) — 0 Errors, 0 Warnings
- **Prettier** (singleQuote, trailingComma: all, printWidth: 120)
- Kein Build-Step — Browser-native ES6-Module via `<script type="module">`
