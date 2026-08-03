---
description: Gera apenas a mensagem de commit a partir do staged diff (não executa o commit)
allowed-tools: Bash(git diff --staged:*), Bash(git diff --staged --stat:*)
---

## Staged diff

!`git diff --staged`

## Tarefa

Com base apenas no diff acima (`git diff --staged`), gere **somente a mensagem de commit**, sem executar `git commit` e sem nenhum outro comando.

Regras:
- Não rode `git commit` nem qualquer outro comando git além do diff já mostrado.
- Se não houver nada staged, avise que não há mudanças staged e pare.
- Siga o estilo dos commits recentes deste repositório (ex.: `feat(battle): ...`, `fix(...): ...`) — mensagem curta, no imperativo, focada no "porquê"/o que mudou.
- Responda apenas com a mensagem de commit (título + corpo se necessário), sem explicações adicionais.
