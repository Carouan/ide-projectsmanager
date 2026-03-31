# 📦 EPIC F0 — Setup & Governance

---

## ISSUE #1 — Setup project governance docs

**Title**  
`F0.1 - Add project governance and PR rules`

**Body**

## Objectif  
Ajouter les règles de travail pour Codex et structurer le projet.  
  
## À faire  
- créer dossier `/docs`  
- ajouter :  
  - roadmap-front-foundations.md  
  - pr-checklist.md  
  - rollback-policy.md  
  
## Contraintes  
- aucun impact runtime  
- aucun refactor  
  
## Validation  
- fichiers présents  
- lisibles dans repo  
  
## Rollback  
- suppression simple des fichiers

---

# 🧱 EPIC F1 — Architecture UI

---

## ISSUE #2 — App Shell

**Title**  
`F1.1 - Introduce AppShell layout`

## Objectif  
Créer un layout principal sans changer le comportement existant.  
  
## À faire  
- créer `src/app/AppShell.jsx`  
- introduire layout global  
- intégrer dans App.jsx  
  
## Ne pas faire  
- ne pas modifier logique métier  
- ne pas déplacer tous les composants  
  
## Validation  
- app fonctionne identiquement  
- build OK  
  
## Rollback  
- revert du fichier AppShell

---

## ISSUE #3 — Feature structure

**Title**  
`F1.2 - Move screens into feature folders`

## Objectif  
Modulariser la structure du projet.  
  
## À faire  
- créer `features/projects/screens`  
- déplacer :  
  - ProjectListScreen  
  - ProjectScreen  
  
## Contraintes  
- ne pas changer logique  
- corriger imports uniquement  
  
## Validation  
- navigation OK  
- aucune régression  
  
## Rollback  
- revert déplacements

---

## ISSUE #4 — Right panel slot

**Title**  
`F1.3 - Add right panel layout slot`

## Objectif  
Préparer le panneau Markdown futur.  
  
## À faire  
- ajouter slot rightPanel dans layout  
- CSS propre  
  
## Validation  
- UI stable  
- pas de bug responsive  
  
## Rollback  
- revert layout

---

# ⚙️ EPIC F2 — Settings

---

## ISSUE #5 — Settings slice

**Title**  
`F2.1 - Add settings slice and defaults`

## Objectif  
Créer le système settings.  
  
## Champs  
- language  
- theme  
- markdownPreviewEnabled  
- uiDensity  
- exportFormat  
  
## Validation  
- valeurs par défaut présentes  
- build OK  
  
## Rollback  
- revert slice

---

## ISSUE #6 — Persist settings

**Title**  
`F2.2 - Persist settings`

## Objectif  
Sauvegarder les settings.  
  
## Validation  
- refresh OK  
- aucun projet perdu  
  
## Rollback  
- revert persistance

---

## ISSUE #7 — Settings UI

**Title**  
`F2.3 - Add settings screen`

## Objectif  
Créer écran settings minimal.  
  
## À faire  
- langue  
- thème  
- toggle markdown  
  
## Validation  
- modifiable + persistant  
  
## Rollback  
- suppression UI

---

# 🌍 EPIC F3 — i18n

---

## ISSUE #8 — i18n core

**Title**  
`F3.1 - Add i18n core`

## Objectif  
Ajouter système traduction simple.  
  
## À faire  
- fr.json  
- en.json  
- useI18n  
  
## Validation  
- fonctionne sans migration complète  
  
## Rollback  
- revert

---

## ISSUE #9 — Global strings

**Title**  
`F3.2 - Migrate global strings`

---

## ISSUE #10 — Project strings

**Title**  
`F3.3 - Migrate project/stage strings`

---

## ISSUE #11 — Remaining modules

**Title**  
`F3.4 - Migrate backlog/journal/decisions`

---

# 📝 EPIC F4 — Markdown Preview

---

## ISSUE #12 — Markdown component

**Title**  
`F4.1 - Add MarkdownPreview component`

---

## ISSUE #13 — Toggle preview

**Title**  
`F4.2 - Add preview toggle from settings`

---

## ISSUE #14 — Render stage content

**Title**  
`F4.3 - Render active stage in preview`

---

# 📎 EPIC F5 — Attachments

---

## ISSUE #15 — Attachment model

**Title**  
`F5.1 - Add attachment model`

---

## ISSUE #16 — Attachments UI

**Title**  
`F5.2 - Add attachments panel`

---

## ISSUE #17 — Integrate attachments

**Title**  
`F5.3 - Integrate attachments into project`

---

# 👤 EPIC U1 — User

---

## ISSUE #18 — Local user

**Title**  
`U1.1 - Add local user profile`

---

## ISSUE #19 — OwnerId

**Title**  
`U1.2 - Attach ownerId to projects`

---

# 💾 EPIC U2 — Storage

---

## ISSUE #20 — Storage abstraction

**Title**  
`U2.1 - Add storage repository layer`

---

## ISSUE #21 — IndexedDB

**Title**  
`U2.2 - Migrate projects to IndexedDB`

---

# 🔄 EPIC U3 — Sync

---

## ISSUE #22 — Sync metadata

**Title**  
`U3.1 - Add sync metadata to project`

---

## ISSUE #23 — Sync engine

**Title**  
`U5.1 - Add sync engine skeleton`

---

## ISSUE #24 — Conflict handling

**Title**  
`U5.2 - Implement conflict detection`

---

## ISSUE #25 — Sync UI

**Title**  
`U5.3 - Add sync status UI`
