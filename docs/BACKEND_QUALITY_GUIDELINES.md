# 🛡️ Diretrizes de Qualidade do Backend (Ruff & Ty)

Este documento estabelece os padrões e diretrizes de qualidade de código estático para o ecossistema Python do projeto **Snake Battle Royale** em conformidade com o **OpenSpec v1.0.0-VIPER** (`REQ-HARN-007`).

---

## 📌 1. Visão Geral das Ferramentas

O backend utiliza o ecossistema moderno da **Astral** para máxima velocidade e rigor estático:

1. **Ruff (`ruff`)**:
   - Linter e formatador de altíssimo desempenho escrito em Rust.
   - Substitui `flake8`, `black`, `isort`, `pyupgrade`, `pydocstyle` e `bandit`.
   - Executa em milissegundos sobre todo o repositório.

2. **Ty (`ty`)**:
   - Verificador de tipos estáticos ultra-rápido desenvolvido pela Astral.
   - Valida a tipagem estrita (PEP 484, PEP 585, PEP 604) sem sobrecarga de runtime.

---

## 📜 2. Regras e Convenções de Tipagem (Python 3.12+)

Para manter 100% de aderência às ferramentas:

### 2.1 Anotações de Tipos Modernas (PEP 585 & PEP 604)
- **Use tipos nativos embutidos:**
  - ✅ `list[str]` em vez de `List[str]`
  - ✅ `dict[str, Any]` em vez de `Dict[str, Any]`
  - ✅ `tuple[float, float]` em vez de `Tuple[float, float]`
  - ✅ `set[int]` em vez de `Set[int]`
- **Use operadores de união modernos:**
  - ✅ `int | None` ou `Optional[int]`
  - ✅ `str | bytes` em vez de `Union[str, bytes]`
- **Coleções abstratas e Callables:**
  - Importe sempre de `collections.abc`: `from collections.abc import Callable, Sequence, Iterable, Mapping`.

### 2.2 Ordenação e Agrupamento de Imports (isort / `I001`)
Todos os arquivos Python devem seguir a convenção de três blocos separados por uma linha em branco:
1. Biblioteca padrão do Python (`math`, `asyncio`, `time`, `typing`).
2. Dependências de terceiros (`fastapi`, `pytest`, `pydantic`).
3. Módulos locais do projeto (`server.app.game.*`, `server.tests.*`).

---

## 🛠️ 3. Comandos de Execução e Verificação

### 3.1 Verificação de Linting
```bash
# Executa verificação do linter
uv run ruff check server

# Corrige automaticamente problemas simples (imports não utilizados, tipagem legada, etc.)
uv run ruff check --fix server
```

### 3.2 Formatação de Código
```bash
# Verifica se o código está formatado (usado no CI)
uv run ruff format --check server

# Formata todos os arquivos do servidor
uv run ruff format server
```

### 3.3 Verificação Estática de Tipos
```bash
# Executa a verificação estática de tipos
uv run ty check server
```

### 3.4 Suíte Completa de Qualidade (Local / Pre-commit)
```bash
uv run ruff check server && uv run ruff format --check server && uv run ty check server && uv run pytest
```

---

## 🚀 4. Integração Contínua (CI Quality Gate)

O workflow do GitHub Actions (`.github/workflows/ci.yml`) bloqueia automaticamente Pull Requests caso:
1. `ruff check` encontre qualquer erro ou aviso não resolvido.
2. `ruff format --check` detecte arquivos desformatados.
3. `ty check` aponte qualquer incompatibilidade de tipos.
4. A cobertura de testes (`pytest --cov`) fique abaixo de $80\%$.
