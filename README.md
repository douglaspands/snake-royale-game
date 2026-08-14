# 🐍 Snake Battle Royale Multiplayer

[![CI](https://github.com/douglas/snake-game/actions/workflows/ci.yml/badge.svg)](file:///.github/workflows/ci.yml)
[![OpenSpec v1.2.0-MICRO-SNAKE](https://img.shields.io/badge/OpenSpec-v1.2.0--MICRO--SNAKE-00f0ff.svg)](file:///home/douglas/Workspace/claude/snake-game/openspec/)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](file:///home/douglas/Workspace/claude/snake-game/pyproject.toml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](file:///home/douglas/Workspace/claude/snake-game/server/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](file:///home/douglas/Workspace/claude/snake-game/client/)
[![Vite](https://img.shields.io/badge/Vite-5.2-purple.svg)](file:///home/douglas/Workspace/claude/snake-game/client/)
[![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg)](file:///home/douglas/Workspace/claude/snake-game/docs/TEST_HARNESS.md)

Um jogo **Multiplayer Online em Tempo Real: Snake Battle Royale** (estilo *Slither.io / Curve Fever*), moderno, com **Reflex Engine (<16ms CSP)**, mecânica de **Cobrinha Inicial Compacta (Tamanho 3)** com **Dreno de Turbo 1:1 e Corte Automático**, construído com **Spec-Driven Development (SDD)** no padrão **OpenSpec** e **Graph Engineering (DAG)**.

---

![Snake Battle Royale Arena Preview](assets/game_preview.png)

---

## ⚡ 1. Início Rápido (Execução com 1 Comando)

O backend FastAPI serve a API, os WebSockets e a interface web compilada (`client/dist`) de forma unificada:

```bash
# 1. Instalar dependências e compilar
uv sync
cd client && npm install && npm run build && cd ..

# 2. Executar o jogo completo com 1 comando
uv run uvicorn server.app.main:app --host 0.0.0.0 --port 8000
```

Abra seu navegador em: **[http://localhost:8000](http://localhost:8000)**

---

## 🏎️ 2. Motor de Precisão & Mecânicas de Jogo

### 🎯 Mecânica de Spawn e Turbo Balanceado (v1.2.0-MICRO-SNAKE)
- **Cobrinha Inicial Compacta:** Ao nascer ou renascer, a cobrinha começa com tamanho mínimo de **3 segmentos** ($M = 3.0$).
- **Bloqueio de Turbo no Tamanho Mínimo:** No tamanho inicial / mínimo ($M \le 3.0$), o Turbo fica travado para evitar abusos na arena.
- **Consumo de Massa 1:1 por Turbo:** Ao coletar comida ($M > 3.0$), o Turbo ($360\text{ px/s}$) drena a massa a $4.0\text{ massa/s}$, soltando exatamente **1 pedaço (boost pellet)** para cada $1.0$ de massa perdida.
- **Corte Automático:** Ao atingir o tamanho 3 ($M = 3.0$), o Turbo desliga automaticamente e retorna à velocidade base ($180\text{ px/s}$).

### ⚡ Reflex Engine (<16ms Latência Percebida)
- **Client-Side Prediction (CSP):** A cobra do jogador local move-se instantaneamente no primeiro frame visual ($<16\text{ms}$).
- **Instant Event-Driven Dispatch:** Mudanças no teclado (`WASD`) ou ângulo do mouse/joystick ($\Delta \theta \ge 0.015\text{ rad}$) são enviadas via WebSocket imediatamente.
- **Dinâmica de Curva Ágil $\omega(M)$:** Velocidade angular de base de $9.8\text{ rad/s}$ ($561.5^\circ/\text{s}$), permitindo curvas de $90^\circ$ em apenas $160\text{ms}$.
- **Reconciliação Exponencial Anti-Snap:** Desvios com o servidor são absorvidos suavemente sem saltos na tela.
- **Buffer de Interpolação Adaptativo:** Cobras de oponentes utilizam buffer dinâmico de $35-45\text{ms}$.

Para mais detalhes matemáticos e de arquitetura, consulte: [`docs/LATENCY_AND_COMMAND_TUNING.md`](file:///home/douglas/Workspace/claude/snake-game/docs/LATENCY_AND_COMMAND_TUNING.md).

---

## 🎮 3. Controles Multiplataforma

| Plataforma | Direção & Movimento | Turbo / Aceleração |
| :--- | :--- | :--- |
| **PC (Desktop)** | **Cursor do Mouse** (aponta e segue) ou **Teclas WASD / Setas** | **Barra de Espaço** ou **Clique Esquerdo** (com $M > 3.0$) |
| **Mobile / Tablet** | **Joystick Virtual Flutuante** (com filtro de deadzone de 4px) | **Botão Turbo Dedicado** (ativo quando $M > 3.0$) |

---

## 🛠️ 4. Modo de Desenvolvimento (Live Reload)

Para trabalhar com hot-reload no frontend e backend simultaneamente:

```bash
# Terminal 1: Backend FastAPI com auto-reload
uv run uvicorn server.app.main:app --reload --port 8000

# Terminal 2: Frontend Vite com HMR
cd client && npm run dev
```

Acesse o cliente Vite em `http://localhost:3000` (conecta automaticamente ao backend na porta `8000`).

---

## 🧪 5. Suíte de Testes & Test Harness (< 2s)

O projeto possui um **Test Harness Determinístico** com relógio virtual e zero bloqueios de tempo real (`sleep`):

```bash
# Linter PEP 8 e checagem estática de tipos do Backend
uv run ruff check server
uv run ruff format --check server
uv run ty check server

# Executar testes do Backend (35 testes, cobertura >= 93% em ~0.4s)
uv run pytest

# Executar testes do Frontend (33 testes, cobertura >= 90% em ~0.4s)
cd client && npm test
```

Para mais detalhes sobre a arquitetura dos testes, consulte: [`docs/TEST_HARNESS.md`](file:///home/douglas/Workspace/claude/snake-game/docs/TEST_HARNESS.md).

---

## 📜 6. Spec-Driven Development (SDD) com OpenSpec

Todas as funcionalidades foram formalmente especificadas antes da escrita do código de produção, seguindo o padrão **[OpenSpec](file:///home/douglas/Workspace/claude/snake-game/openspec/)**:

- [`openspec/config.yaml`](file:///home/douglas/Workspace/claude/snake-game/openspec/config.yaml): Configuração do ecossistema OpenSpec.
- [`openspec/specs/protocol/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/protocol/spec.md): JSON Schemas de todas as mensagens WebSocket.
- [`openspec/specs/physics/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/physics/spec.md): Equações de movimento, dinâmica $\omega(M)$ e colisões.
- [`openspec/specs/lifecycle/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/lifecycle/spec.md): Máquina de Estados Finita (FSM) do Jogador e da Sala.
- [`openspec/specs/harness/spec.md`](file:///home/douglas/Workspace/claude/snake-game/openspec/specs/harness/spec.md): Invariantes do Test Harness determinístico.
- [`docs/SPEC_DRIVEN_DEVELOPMENT.md`](file:///home/douglas/Workspace/claude/snake-game/docs/SPEC_DRIVEN_DEVELOPMENT.md): Guia prático da metodologia SDD.
- [`docs/LATENCY_AND_COMMAND_TUNING.md`](file:///home/douglas/Workspace/claude/snake-game/docs/LATENCY_AND_COMMAND_TUNING.md): Guia do motor de baixa latência e CSP.

---

## 🏗️ 7. Arquitetura e Grafo DAG

```mermaid
graph TD
    N_ROOT["[Nó 0] OpenSpec SDD (openspec/ & specs/) + Git (.gitignore & CI)"]
    N_B1["[Nó B1] Backend Setup (uv) + Harness pytest"]
    N_F1["[Nó F1] Frontend Setup (Vite+TS) + Harness Vitest"]
    N_B2["[Nó B2] TDD Física Dinâmica w(M) e Colisões (pytest)"]
    N_F2["[Nó F2] TDD Instant Reflex & Client-Side Prediction (Vitest)"]
    N_B3["[Nó B3] Game Loop 30-40Hz + WebSocket Server"]
    N_F3["[Nó F3] Canvas 2D 60-120FPS + Interpolação Adaptativa"]
    N_INT["[Nó INT] Integração E2E + Servir Frontend no FastAPI"]
    N_GATE["[Nó GATE] Validação Rigorosa em 100% das Ferramentas"]
    N_DOC["[Nó DOC] README.md + Specs Atualizadas + Docs de Latência"]

    N_ROOT --> N_B1 --> N_B2 --> N_B3 --> N_INT
    N_ROOT --> N_F1 --> N_F2 --> N_F3 --> N_INT
    N_INT --> N_GATE --> N_DOC
```
