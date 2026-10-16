# poke-api-nest

API do projeto Pokémon: REST + WebSocket (chat e batalha PvP/bot por turnos). O front que consome esta API fica em `../profile` (Next.js).

Stack: NestJS 11, Prisma 7 + MariaDB/MySQL, Socket.io, JWT/Passport, Jest. Gerenciador: **yarn** (é o que o Dockerfile usa; ignore o `package-lock.json`).

## Comandos

```bash
yarn dev                 # watch mode, porta 3333; Swagger em /docs/swagger
yarn test                # Jest (arquivos *.spec.ts dentro de src/)
yarn test -- battle-engine   # roda só os specs que casam com o nome
yarn lint                # eslint --fix
npx prisma generate      # após qualquer mudança em prisma/schema.prisma
npx prisma migrate dev --name <nome>
yarn seed                # popula pokémons, moves e itens a partir da PokéAPI
```

## Arquitetura

- `src/modules/<modulo>/` segue o padrão: `*.controller.ts` → `services/` → `repositories/` (Prisma), com `dto/` (class-validator + `@ApiProperty`) e `gateways/` quando há WebSocket. Módulos mais antigos (`pokemon`, `items`...) têm os arquivos soltos na raiz do módulo; siga o padrão do módulo que estiver editando.
- `src/modules/battle/services/` é o coração do projeto:
  - `battle-engine.service.ts` — resolução de turno (dano, tipos, prioridade, PP, desmaio, vitória). Lógica pura, coberta por spec.
  - `status-conditions.ts`, `stat-stage-moves.ts`, `type-chart.ts` — regras de status, stat stages (-6..+6) e efetividade.
  - `battle-ai.service.ts` — o bot oponente.
  - `battle.services.ts` — orquestra salas, persistência e eventos do gateway.
- Design da batalha documentado em `docs/battle-*.md` (pasta local, fora do git).

## Autenticação e permissões

Três guards globais (`src/common/auth/auth.module.ts`): `JwtAuthGuard`, `RolesGuard`, `TestRoleGuard`.

- Toda rota é protegida por padrão; use `@Public()` para liberar.
- `@Roles(...)` restringe por role (`ADMIN`, `CLIENT`, `TEST`).
- Usuário `TEST` é **somente leitura**: POST/PUT/PATCH/DELETE retornam 403, a menos que a rota tenha `@AllowTestRole()` (ex.: criar/entrar em batalha). Ao criar rota de escrita, decida conscientemente se o usuário de teste pode usá-la.
- Usuário logado: `@GetUser('id')`. Nos WebSockets o token vem em `handshake.auth.token`.

## Regras

- **Não edite `src/generated/prisma/`** — é gerado pelo `prisma generate` (e está versionado). Importe enums de `src/generated/prisma/enums`.
- Mudou o schema → crie migration e rode `prisma generate`; nunca edite migrations já aplicadas.
- Ao mexer no motor de batalha, rode e atualize `battle-engine.service.spec.ts` / `battle-ai.service.spec.ts`. Prefira escrever o teste antes.
- Mudou um contrato REST ou evento de socket → o front em `../profile` (`src/services/queries`, `src/context/BattleContext.tsx`, `src/types`) precisa acompanhar. Avise.
- Endpoints novos levam `@ApiTags`, `@ApiOperation` e `@ApiResponse` com DTO de resposta tipado.
- Mensagens de erro e textos ao usuário em **português**.
- Prettier: aspas simples, trailing comma.
- Commits no padrão Conventional Commits em português: `feat(battle): ...`, `fix: ...`.
- Nunca leia nem comite `.env*`.
