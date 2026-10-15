#!/bin/bash
# Synchro GitHub entre plusieurs comptes Claude.
#   start : au début de la session, récupère la dernière version (git pull --ff-only si l'arbre est propre)
#   stop  : à la fin de chaque réponse, rappelle de committer/pousser s'il reste du travail non envoyé
mode="$1"
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
branch=$(git rev-parse --abbrev-ref HEAD)

json() { # $1 = message utilisateur, $2 = contexte pour Claude (optionnel)
  python3 -c 'import json,sys
o={"systemMessage":sys.argv[1]}
if len(sys.argv)>2 and sys.argv[2]:
    o["hookSpecificOutput"]={"hookEventName":"SessionStart","additionalContext":sys.argv[2]}
print(json.dumps(o))' "$@"
}

if [ "$mode" = "start" ]; then
  if ! git fetch -q origin 2>/dev/null; then
    json "⚠️ git fetch impossible (hors ligne ?) — pense à faire git pull avant de travailler." "Le git fetch a échoué au démarrage : faire git pull avant toute modification."
    exit 0
  fi
  behind=$(git rev-list --count HEAD..origin/"$branch" 2>/dev/null || echo 0)
  if [ "$behind" -eq 0 ]; then
    json "✅ Git : à jour avec GitHub (origin/$branch)."
  elif [ -z "$(git status --porcelain --untracked-files=no)" ] && git pull -q --ff-only origin "$branch" 2>/dev/null; then
    json "⬇️ Git pull : $behind commit(s) récupéré(s) depuis GitHub." "Au démarrage, $behind commit(s) ont été récupérés depuis GitHub (travail fait depuis l'autre compte Claude). Relire git log -$behind avant de continuer."
  else
    json "⚠️ $behind commit(s) sur GitHub non récupérés (modifications locales en cours) — fais git pull avant de travailler." "La branche locale a $behind commit(s) de retard sur origin/$branch et l'arbre de travail n'est pas propre : proposer de régler cela avant toute modification."
  fi
  exit 0
fi

if [ "$mode" = "stop" ]; then
  dirty=$(git status --porcelain --untracked-files=no | wc -l | tr -d ' ')
  ahead=$(git rev-list --count origin/"$branch"..HEAD 2>/dev/null || echo 0)
  msg=""
  [ "$dirty" -gt 0 ] && msg="$dirty fichier(s) modifié(s) non commités"
  [ "$ahead" -gt 0 ] && msg="${msg:+$msg, }$ahead commit(s) non poussés"
  [ -n "$msg" ] && json "🔔 Avant de changer de compte Claude : $msg → commit + git push."
  exit 0
fi
