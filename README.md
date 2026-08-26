# AlKÉ Finance — Console d'administration (back-office)

Console web (React + Vite + TypeScript) couvrant le Module 9 du CDC
(ALKE-CDC-2026-001) : gestion des utilisateurs et KYC, catalogue, pipeline
de partenaires boursiers (SDB/SGI), rapprochement des ordres, dépôts/retraits
en attente, grille tarifaire, support client, journal d'audit.

## Démarrage

```bash
npm install
npm run dev     # http://localhost:5173 — nécessite le backend sur :3000
```

Connectez-vous avec le compte admin créé par le seed du backend
(`admin@alke.finance` / `ChangeMe!2026`).

## Page la plus utile pour démarrer : Partenaires

`/partners` reproduit directement le pipeline de démarchage décrit dans les
guides ALKE-BOURSE-2026-001 (BVMAC) et -002 (BRVM/AELP) : les partenaires
identifiés dans ces documents y sont déjà pré-chargés (statut « Prospect »).
Faire passer un partenaire à **Actif** bascule automatiquement le marché
correspondant en mode réel côté moteur d'ordres — c'est le geste back-office
qui, le jour venu, fera passer AlKÉ Finance du mode simulé au mode réel pour
ce marché.
