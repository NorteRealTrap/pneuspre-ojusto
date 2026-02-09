# Commit automatico rapido

- `git ac` adiciona todas as mudancas e cria commit com mensagem `auto-YYYYMMDD-HHMMSS`.
- `git ac -- -Message \"sua mensagem\"` permite definir a mensagem manualmente.
- `git acp` faz o mesmo e ja envia `push` para o `origin/<branch-atual>`.
- Script base: `scripts/auto-commit.ps1` (pode ser chamado direto no PowerShell se preferir).

Requisitos: Git e PowerShell disponiveis no sistema.
