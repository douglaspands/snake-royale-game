# 🐍 Snake Battle Royale — Antigravity & OpenSpec Project Rules

Este arquivo define as diretrizes obrigatórias para o **Google Antigravity (AGY)** neste repositório, garantindo conformidade rigorosa com **Spec-Driven Development (SDD)**, **Quality Gates** e **Eficiência de Tokens**.

---

## 🎯 1. Spec-Driven Development (SDD) com OpenSpec

1. **Prioridade de Especificação:** Nenhuma linha de código de produção deve ser implementada antes que o respectivo requisito esteja formalmente documentado e validado em `openspec/`.
2. **Localização Canônica de Especificações:** As capacidades do sistema residem em `openspec/specs/<capacidade>/spec.md` (`harness`, `hud`, `lifecycle`, `physics`, `protocol`, `rendering`).
3. **Padrão de Requisitos:**
   - Todo arquivo de especificação DEVE conter as seções `## Purpose` e `## Requirements`.
   - Cada requisito DEVE usar palavras-chave RFC 2119 (MUST, SHALL, SHOULD) ou formato EARS.
   - Cada requisito DEVE conter pelo menos um bloco `#### Scenario:` com cláusulas `- **WHEN**` e `- **THEN**`.
4. **Workflows OpenSpec via Slash Commands:**
   - `/opsx-propose`: Iniciar uma nova proposta de mudança (`openspec/changes/<id>/`).
   - `/opsx-apply`: Implementar tarefas seguindo TDD e DAG.
   - `/opsx-sync`: Sincronizar especificações delta com o código.
   - `/opsx-archive`: Arquivar mudanças concluídas e promover especificações canônicas.
   - `/opsx-explore`: Modo de investigação e alinhamento de arquitetura.

---

## 🛡️ 2. Quality Gates & Padrões Técnicos

1. **Zero-Sleep Test Harness:** Nenhum teste automatizado pode usar `time.sleep()` ou `setTimeout()`. Toda simulação temporal deve utilizar o relógio virtual discreto (`VirtualClock`).
2. **Cobertura de Código Mínima:** A cobertura de testes deve ser $\ge 80\%$ tanto no Backend (`pytest`) quanto no Frontend (`vitest`).
3. **Qualidade Estática do Backend (Python 3.12+):**
   - 100% de conformidade com `uv run ruff check server` (zero avisos/erros).
   - 100% de conformidade com `uv run ruff format --check server`.
   - 100% de conformidade com `uv run ty check server` (zero erros de tipagem).
4. **Qualidade do Frontend (TypeScript + Vite + Canvas 2D):**
   - 100% de conformidade com `npm test` e `npm run build`.
5. **Servidor Unificado:** O backend Starlette serve a API WebSocket e os assets compilados do frontend (`client/dist`) em um único comando: `uv run uvicorn server.app.main:app --host 0.0.0.0 --port 8000`.

---

## ⚡ 3. Eficiência de Tokens (Token Cost Optimization)

1. **Respeito aos Filtros de Workspace:** Respeite rigorosamente `.antigravityignore` e `.ignore`. Nunca tente ler bundles compilados (`client/dist/`), caches (`.pytest_cache`, `.ruff_cache`), arquivos de coverage ou logs.
2. **Modularidade e Foco:** Mantenha módulos com menos de 300 linhas de código sempre que possível.
3. **Leituras Cirúrgicas:** Ao inspecionar arquivos, utilize limites de linhas (`StartLine`/`EndLine`) para não poluir a janela de contexto.
