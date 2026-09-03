# QBST — Extracteur de termes saillants

Outil interne Uni-Médias : tape un mot-clé, l'outil scanne la page 1 de Google, récupère le contenu
des pages positionnées, et en extrait le champ lexical pondéré (termes saillants + fourchette de
fréquence conseillée), regroupé par concept — sur le principe QBST. Objectif : remplacer la brique
« termes associés » de Semji.

## 1. Récupérer une clé Serper.dev (gratuite, sans vérification téléphone)

1. Va sur https://serper.dev et inscris-toi (email uniquement, aucune carte ni téléphone requis).
2. Une fois connecté, ta clé API est visible sur ton tableau de bord.
3. Le compte gratuit inclut 2 500 recherches offertes à l'inscription (crédit unique, non renouvelé
   chaque mois — à surveiller si l'équipe l'utilise beaucoup ; il faudra alors passer sur un plan
   payant Serper.dev).

## 2. Tester en local

Dans un terminal, à la racine du projet :

```bash
npm install
cp .env.local.example .env.local
```

Ouvre `.env.local` et colle ta clé : SERPER_API_KEY=ta_cle_ici

Puis lance le serveur de développement :

```bash
npm run dev
```

Ouvre http://localhost:3000 dans ton navigateur, tape un mot-clé, clique sur "Analyser la SERP".

## 3. Déployer sur Vercel

1. Pousse ce projet sur GitHub.
2. Va sur https://vercel.com, connecte-toi avec ton compte GitHub.
3. Clique "Add New… → Project", sélectionne le dépôt.
4. Avant de cliquer "Deploy", ouvre "Environment Variables" et ajoute :
   - Nom : `SERPER_API_KEY`
   - Valeur : ta clé Serper.dev
5. Clique "Deploy".

## Limites connues de cette V1

- **Scraping bloqué sur certains sites.** Certains sites bloquent les requêtes automatisées. Ces
  pages apparaissent en "pages ignorées" dans l'interface.
- **Regroupement par concept approximatif**, sans IA (rule-based).
- **Quota Serper.dev.** 2 500 recherches offertes une seule fois à l'inscription.
