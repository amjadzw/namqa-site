# Namqa Site — Claude Code Context

> Fichier de passation : relu à chaque nouvelle session. Créé le 2026-10-15.
> ⚠️ Dépôt **PUBLIC** (amjadzw/namqa-site) : n'y écrire aucun mot de passe, clé, e-mail privé ni donnée client.

## Présentation
Site vitrine de **Namqa Studio** : cartes de fidélité 100 % digitales dans Apple Wallet / Google Wallet,
pour commerces, restaurants, salons, boutiques. Charte et ton : voir `BRAND.md`.

## Stack
- **Site statique**, sans étape de build : `index.html` + `merci.html`, `assets/css`, `assets/js`, `assets/images`.
- **Contenu** dans `content/*.json` (hero, tarifs, FAQ, etc.), lu par le navigateur au chargement.
- **Decap CMS** sur `/admin` (`admin/config.yml`, backend `git-gateway`, branche `main`, `publish_mode: simple`) :
  chaque modification faite dans l'admin **crée un commit directement sur GitHub**.
- **Hébergement Netlify** (`netlify.toml` : publish `.`, en-têtes de cache, redirections `/rush` et `/jeu`
  vers https://rush.namqa.ch/). Un push sur `main` redéploie le site.

## Aperçu local
```bash
python3 -m http.server 8080   # puis http://localhost:8080 (le fetch des JSON exige un serveur, pas file://)
```

## Points d'attention
- Les modifications de textes passent de préférence par `content/*.json` (ce que l'admin Decap édite),
  pas en dur dans `index.html`, sinon l'admin ne pourra plus les modifier.
- Si un champ JSON est ajouté ou renommé, mettre à jour `admin/config.yml` en même temps.

## Synchro entre comptes Claude (règle)
Ce dépôt est travaillé depuis **deux comptes Claude** et aussi via **l'admin Decap** ; GitHub (`origin/main`) est la seule source de vérité.
1. **Début de session** : `git pull` (fait automatiquement par le hook `SessionStart` si l'arbre est propre).
2. **Avant de changer de compte** : commit + `git push` (le hook `Stop` le rappelle tant qu'il reste du travail non poussé).
3. Ne jamais travailler sur ce dépôt depuis les deux comptes en même temps.
Hooks : `.claude/settings.json` → `.claude/hooks/git-sync.sh`. Ne jamais utiliser `~/Documents/Claude-project-amj-ANCIEN-NE-PAS-UTILISER/`.
