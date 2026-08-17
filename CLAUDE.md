# 🐍 Snake Battle Royale — Instruções para o Claude Code

Projeto de jogo multiplayer em tempo real construído com **Spec-Driven Development (SDD)** via OpenSpec e **Graph Engineering**.

> Este arquivo é carregado em toda sessão — ele **aponta** para as fontes canônicas em vez de duplicá-las.
> Regras autoritativas: [`openspec/config.yaml`](openspec/config.yaml).

---

## ⚡ Comandos essenciais

| Comando | O que faz |
| :--- | :--- |
| `npm test` | Gate completo: `pytest` + `vitest` + `openspec validate` |
| `npm run lint` | `ruff check` + `ruff format --check` + `ty check` no `server/` |
| `npm run lint:fix` | Corrige lint e formatação do backend |
| `npm run dev` | Servidor unificado com reload em `0.0.0.0:8000` |
| `npm run spec:validate` | `openspec validate --specs --no-interactive` |
| `npm run spec:doctor` | `openspec doctor` (saúde das specs) |
| `npm run android:sync-client` | Build do client + cópia para os assets do Android |

Backend isolado: `uv run pytest` · Frontend isolado: `cd client && npm test`

---

## 🗺️ Arquitetura

- **`server/`** — Starlette + Uvicorn + WebSockets; loop autoritativo de 30-40 Hz. Serve também os assets compilados do client (servidor unificado, porta 8000).
- **`client/`** — Vite + TypeScript + Canvas 2D (60-120 FPS); interpolação LERP adaptativa com Client-Side Prediction.
- **`android/`** — App host que embarca o servidor Python via **Chaquopy** (Kotlin DSL, bloco `chaquopy { }`).
- **`openspec/specs/<capacidade>/spec.md`** — specs canônicas. Capacidades: `android`, `harness`, `hud`, `lifecycle`, `physics`, `protocol`, `rendering`.
- **`openspec/changes/`** — changes ativas; concluídas vão para `openspec/changes/archive/`.
- **`.agent/`** (Antigravity) e **`.claude/`** (Claude Code) — adaptadores sobre o mesmo conjunto de workflows `/opsx-*`.

---

## 📐 Spec-Driven Development (regra inegociável)

1. **Nenhuma linha de código de produção antes da spec correspondente estar escrita e validada.**
2. Todo spec tem as seções `## Purpose` e `## Requirements`.
3. Cada requisito usa o cabeçalho `### Requirement: REQ-<CAP>-<NNN> <Título>`, redação em **RFC 2119** (MUST, SHALL, SHOULD, MAY) ou EARS, e **pelo menos um** bloco `#### Scenario:` com cláusulas `- **WHEN**` / `- **THEN**`.
4. Deltas de change usam blocos `## ADDED Requirements` / `## MODIFIED Requirements` e casam com o spec principal **pelo identificador do requisito** — mantenha o cabeçalho idêntico.
5. **Sempre antes de iniciar a escrita de uma spec (proposal, design, tasks ou spec deltas) em `openspec/changes/`, criar uma branch dedicada a partir de `main`** — nunca escrever specs diretamente na `main`. Convenção de nome (boas práticas Git/GitHub, ver precedentes com `git branch -a`): `feature/<slug>` para novas capacidades, `hotfix/<versão>-<slug>` para correções, espelhando o `change id` da spec. Publicar a branch no remoto assim que criada (`git push -u origin <branch>`), antes de escrever qualquer artefato.

### Workflows (slash commands)

`/opsx-propose` → `/opsx-apply` → `/opsx-sync` → `/opsx-archive`. Auxiliares: `/opsx-explore`, `/opsx-update`.

`/opsx-propose` é **planning-only**: cria os artefatos e para. A implementação só começa com `/opsx-apply`.

---

## 🛡️ Quality gates

- Cobertura ≥ **80%** no backend (`pytest`) **e** no frontend (`vitest`).
- **Zero erros** em `ruff check`, `ruff format --check` e `ty check`.
- **Zero-sleep nos testes:** nunca `time.sleep()` ou `setTimeout()`. Toda simulação temporal usa o relógio virtual discreto (`VirtualClock`) — ver [`docs/TEST_HARNESS.md`](docs/TEST_HARNESS.md).
- Backend em **Python 3.12+** (`requires-python = ">=3.12"`); o runtime Chaquopy embarcado no APK **deve acompanhar essa versão**.

---

## 🔧 Convenção de hotfix

Padrão estabelecido nas releases 1.5.x (ver `openspec/changes/archive/`):

- **Change id:** `v<semver>-hotfix-<slug>` (ex.: `v1.5.3-hotfix-chaquopy-abi`).
- **4 artefatos:** `proposal.md` (Why / What Changes / Capabilities / Impact), `design.md` (Context / Goals-Non-Goals / Decisions / Risks), `tasks.md`, `specs/<capacidade>/spec.md`.
- **`tasks.md` na topologia DAG** de Graph Engineering: `Node 0` (ambiente e validação de specs), `B1-B3` (backend/infra), `F1-F3` (frontend), `INT` (quality gates), `DOC` (sync de specs).
- Ao arquivar, prefixar com a data: `openspec/changes/archive/AAAA-MM-DD-<change-id>/`.
- Ao mexer no Android, manter `versionCode`/`versionName` em `android/app/build.gradle.kts` sincronizados com a tag da release.

---

## 🧩 Execução paralela com sub-agentes

Quando uma change toca conjuntos de arquivos disjuntos (ex.: `android/` + `client/`), o `tasks.md` divide o DAG em **lanes** executadas por sub-agentes concorrentes. Referência viva: `openspec/changes/v1.6.1-hotfix-mobile-gameplay/`.

- **`Node 0` é bloqueante e roda no orquestrador.** Nenhuma lane começa antes de `npm run spec:validate` passar — a regra SDD não admite código antes da spec validada.
- **Worktrees de lane nascem da branch default, não do seu `HEAD`.** Na `v1.6.1` as três saíram de `origin/main` (`a81dbb4`), sem o trabalho de v1.5.4/v1.5.5/v1.6.0 que estava só na branch de feature. **Enquanto a feature não estiver mergeada na default, confira `git worktree list` e `git log --oneline -1 <branch-da-worktree>` antes de aceitar qualquer lane**, e gere o patch de cada uma com `git diff <HEAD-correto> -- <apenas os arquivos do allowlist dela>` — sem restringir aos arquivos da lane, o diff reverte o trabalho das outras releases.
- **Uma lane = um requisito.** Cada lane é dona de exatamente um `REQ-*` e é lançada com `isolation: "worktree"`, para não enxergar trabalho parcial das outras.
- **Contrato de lane no `design.md`:** tabela com *sub-agente · requisito · allowlist de arquivos · denylist*. Lane que precisa cruzar a fronteira **para e reporta**, não edita.
- **Lanes não rodam o gate raiz.** O worktree de uma lane contém só um pedaço da change; `npm test` e `npm run lint` são do `Node INT`, sobre a árvore já mesclada.
- **Ordem de merge explícita** quando duas lanes tocam o mesmo arquivo em regiões distintas — declare quem entra primeiro e quem rebaseia.
- **Nós que ficam no orquestrador:** `0`, `MERGE`, `INT`, `VAL` (validação em device físico) e `DOC`.

---

## 🪶 Eficiência de tokens

1. Respeite `.ignore`, `.antigravityignore` e `.cursorignore` — nunca leia bundles (`client/dist/`), caches, coverage ou lockfiles (`uv.lock`, `package-lock.json`).
2. **`android/app/src/main/python/server/` e `android/app/src/main/assets/client_dist/` são cópias geradas** de `server/` e `client/dist/`. Nunca edite nem pesquise nelas — a fonte é sempre a original.
3. Leituras cirúrgicas: use `offset`/`limit` no `Read` em vez de carregar arquivos inteiros.
4. Mantenha módulos de produção com **menos de 300 linhas**.
