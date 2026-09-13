# AlKÉ Finance — Console d'administration (back-office)

Console web interne (React 19 + Vite + TypeScript + react-router 7, sans kit UI) du
back-office AlKÉ Finance. Elle consomme l'API du backend AlKÉ (blueprint v3.2) via un
client HTTP typé unique (`src/api.ts`, formes de données dans `src/api/types.ts`).

## Démarrage

```bash
npm install
cp .env.example .env      # puis ajuster VITE_API_BASE_URL si besoin
npm run dev               # http://localhost:5173 (port strict — le CORS du backend l'attend)
```

| Variable            | Rôle                                                        | Défaut                  |
| ------------------- | ----------------------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL` | URL de base du backend (sans slash final), lue au **build** | `http://localhost:3000` |

Le compte administrateur initial est créé par le seed du **backend** à partir de ses
variables `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` : utilisez ces identifiants sur
l'écran de connexion. Aucun identifiant n'est stocké dans ce dépôt.

## Rôles et accès

Seuls les rôles `ADMIN`, `COMPLIANCE` et `SUPPORT` peuvent se connecter (un compte
`USER` est refusé). La matrice est dans `src/auth.tsx` (`roleCan`) ; la navigation et les
routes sont filtrées avec `can()` / `RequirePermission`, et les boutons d'action ne
s'affichent que si le rôle le permet.

| Section                         | ADMIN | COMPLIANCE            | SUPPORT |
| ------------------------------- | :---: | :-------------------: | :-----: |
| Vue d'ensemble                  |  ✔︎   | ✔︎                    |         |
| Approbations (maker-checker)    |  ✔︎   | ✔︎                    |         |
| Utilisateurs                    |  ✔︎   | lecture               | lecture |
| File KYC                        |  ✔︎   | ✔︎                    |         |
| Comptes-titres                  |  ✔︎   | lecture               |         |
| Ordres (revue)                  |  ✔︎   | ✔︎                    |         |
| Lots SDB (ORD/ACK/EXE/WDR/CSH)  |  ✔︎   | lecture               |         |
| Catalogue, Partenaires          |  ✔︎   |                       |         |
| Paiements                       |  ✔︎   | lecture               |         |
| Rapprochement                   |  ✔︎   | ✔︎                    |         |
| Frais (propositions)            |  ✔︎   |                       |         |
| Conformité                      |  ✔︎   | ✔︎                    |         |
| Journal d'audit                 |  ✔︎   | ✔︎                    |         |
| Configuration                   |  ✔︎   | lecture               |         |
| Support, Notifications          |  ✔︎   |                       | ✔︎      |

Les actions sensibles (déblocage, décision KYC sensible, revue d'ordre, passage d'un
marché en réel, frais, configuration, complétion forcée d'un paiement, passation en
perte, décision de conformité) ne s'appliquent pas directement : l'API renvoie une
demande d'approbation (`PendingApproval`) qu'un **second** opérateur valide dans
« Approbations ». Un demandeur ne peut pas valider sa propre action.

## Structure

```
src/
  api.ts            client HTTP (jetons en sessionStorage, refresh single-flight, erreurs typées)
  api/types.ts      contrat backend
  auth.tsx          AuthProvider, matrice des rôles, can()
  hooks.ts          useLoad (chargement + toast d'erreur), useBusy (mutation + état occupé)
  format.ts         fr-FR : montants (0 décimale XAF/XOF), dates, nombres
  components/       DataTable, Modal, Drawer, Badge, Money, DateTime, Field, JsonView, …
  pages/            une page par section
```

## Qualité et build

```bash
npx tsc -b        # types (zéro erreur attendue)
npm run lint      # oxlint
npm run build     # tsc -b + vite build → dist/
npm run preview   # sert dist/ sur :5173
```

La CI (`.github/workflows/ci.yml`) exécute ces trois étapes puis construit l'image Docker
(`Dockerfile` + `nginx.conf`, SPA servie par nginx). Le build est statique : changer
`VITE_API_BASE_URL` impose de reconstruire.
