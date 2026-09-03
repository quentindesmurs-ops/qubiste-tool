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

Ouvre `.env.local` et colle ta clé :
