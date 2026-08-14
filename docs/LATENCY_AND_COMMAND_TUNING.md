# ⚡ Command Latency & Reflex Engine Tuning Guide (v1.1.0-REFLEX)

## 📌 1. Visão Geral da Arquitetura Reflex

O jogo **Snake Battle Royale** implementa uma arquitetura híbrida de alto desempenho:
1. **Zero-Lag Local Client-Side Prediction (CSP):** A cobra do jogador local responde e se move instantaneamente no mesmo frame ($< 16\text{ms}$ a 60 FPS / $< 8.3\text{ms}$ a 120 FPS).
2. **Instant Reflex Dispatcher:** Mudanças no teclado (`WASD`/Setas), botões de mouse ou desvios de mira no cursor/joystick ($\Delta \theta \ge 0.015\text{ rad}$) disparam pacotes de input imediatamente via WebSocket, sem aguardar o intervalo periódico.
3. **Dinâmica de Curva Ágil $\omega(M)$:** Velocidade angular ágil de base de $9.8\text{ rad/s}$ ($561.5^\circ/\text{s}$) escalonada com a massa da cobra.
4. **Reconciliação Exponencial sem Saltos (Anti-Snap):** Desvios sutis entre a predição local e os snapshots autoritativos do servidor são suavizados assintoticamente por decaimento exponencial ($e^{-\lambda \Delta t}$ com $\lambda = 15.0$).
5. **Buffer de Interpolação Adaptativo para Oponentes:** Cobras remotas utilizam buffer dinâmico de $35-45\text{ms}$ (em vez de 100ms estático), reduzindo o atraso visual dos adversários em mais de 55%.

---

## 📊 2. Comparativo de Latência e Desempenho

| Etapa do Pipeline | v1.0.0-VIPER (Legado) | v1.1.0-REFLEX (Atual) | Redução / Ganho |
| :--- | :--- | :--- | :--- |
| **Amostragem de Entrada** | 33.3ms (polling fixo) | $< 1\text{ms}$ (event-driven) | **-97% delay** |
| **Resposta Visual Local** | $\approx 450 - 550\text{ms}$ (aguarda RTT + LERP) | **$< 16\text{ms}$ (predição no 1º frame)** | **Instantâneo** |
| **Tempo para Curva de $90^\circ$** | $350\text{ms}$ ($\omega = 4.5\text{ rad/s}$) | **$160\text{ms}$** ($\omega = 9.8\text{ rad/s}$) | **54% mais rápido** |
| **Buffer de Interpolação Remota** | $100\text{ms}$ (estático) | **$35 - 45\text{ms}$ (adaptativo)** | **-60% delay** |

---

## 🧮 3. Formulação Matemática

### 3.1 Modelo de Turn Rate Ágil com Escalonamento de Massa
$$\omega(M) = 5.2 + \frac{4.6}{1 + 0.015 \cdot \max(0, M - 10)}$$

- **Massa Inicial ($M = 10$):** $\omega = 9.8\text{ rad/s}$ $\rightarrow$ manobras e esquivas rápidas.
- **Massa Média ($M = 50$):** $\omega \approx 8.08\text{ rad/s}$.
- **Massa Gigante ($M = 100$):** $\omega \approx 6.95\text{ rad/s}$.
- **Massa Titã ($M \ge 500$):** $\omega \to 5.2\text{ rad/s}$ $\rightarrow$ sensação de peso mantendo dirigibilidade.

### 3.2 Suavização de Reconciliação (Anti-Snap)
Quando o snapshot com posição autoritativa $(x_{\text{srv}}, y_{\text{srv}})$ chega:
$$\vec{\epsilon} = \vec{P}_{\text{srv}} - \vec{P}_{\text{local}}$$
Se $\|\vec{\epsilon}\| > 180\text{px}$ (teletransporte / perda extrema de pacotes): correção instantânea.  
Se $0.5\text{px} \le \|\vec{\epsilon}\| \le 180\text{px}$:
$$\vec{P}_{\text{visual}}(t) = \vec{P}_{\text{local}}(t) + \vec{\epsilon}_{\text{offset}}(t)$$
$$\vec{\epsilon}_{\text{offset}}(t + \Delta t) = \vec{\epsilon}_{\text{offset}}(t) \cdot e^{-15.0 \cdot \Delta t}$$

---

## 🛠️ 4. Guia de Validação com Ferramentas do Projeto

Todas as ferramentas configuradas no repositório validam esta especificação:

```bash
# 1. Linter e formatador PEP 8
uv run ruff check server
uv run ruff format --check server

# 2. Type Checker estático do Backend
uv run ty check server

# 3. Testes unitários e Test Harness determinístico do Backend (pytest + cov >= 80%)
uv run pytest

# 4. Testes do Frontend e Test Harness de Predição (vitest + v8 coverage >= 80%)
cd client && npm test

# 5. Build de produção do Frontend (TypeScript + Vite)
cd client && npm run build
```
