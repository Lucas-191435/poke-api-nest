<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">🧩 Poké API</h1>

<p align="center">
  API RESTful + WebSocket desenvolvida com <b>NestJS</b>, <b>TypeScript</b> e <b>Prisma ORM</b>, integrando dados da <a href="https://pokeapi.co/">PokéAPI</a> para gerenciamento de pokémons, movimentos, itens, usuários e batalhas PvP em tempo real.
</p>

## 📦 Sobre o projeto

API backend do meu projeto pessoal de Pokémon. Além do CRUD tradicional (pokémons, movimentos, itens, time do treinador), o projeto inclui:

- **Autenticação** via JWT (login + reset de senha).
- **Chat em tempo real** entre usuários via WebSocket (Socket.io).
- **Sistema de batalha PvP por turnos** (também via WebSocket), com cálculo de dano, efetividade de tipos, PP, status (paralisia, veneno, queimadura, sono, congelamento, confusão), stat stages e resolução completa de turno.

## 🧱 Stack

- [NestJS 11](https://nestjs.com/) — framework backend
- [Prisma ORM 7](https://www.prisma.io/) + **MariaDB/MySQL** — persistência
- [Socket.io](https://socket.io/) — comunicação em tempo real (chat e batalha)
- **JWT** (`@nestjs/jwt`, `passport-jwt`) — autenticação
- [Swagger](https://docs.nestjs.com/openapi/introduction) — documentação interativa da API
- **Jest** — testes unitários e e2e
- **Docker** — build e deploy em produção

## 🗂️ Módulos

| Módulo | Descrição |
| --- | --- |
| 👤 `auth` | Login e reset de senha (JWT) |
| 🐾 `pokemon` | Consulta da dex de pokémons (integrada com a PokéAPI) |
| 🎒 `my-pokemon` | Pokémons capturados pelo usuário, times (alpha/beta/gamma) e movesets |
| ⚔️ `pokemonMove` | Relação pokémon ↔ movimento (método e nível de aprendizado) |
| 🧪 `items` | Itens do jogo (poké bolas, cura, evolução, etc.) |
| 💬 `chat` | Salas de chat e mensagens em tempo real (WebSocket) |
| 🥊 `battle` | Motor de batalha PvP por turnos (REST para criar/entrar/listar salas + WebSocket para a partida) |

### Sistema de batalha

O módulo `battle` implementa uma partida PvP completa:

- Criação e entrada em salas (`POST /battle`, `POST /battle/:id/join`), listagem (`GET /battle/rooms`) e exclusão em massa (`DELETE /battle/all`).
- Partida em tempo real via WebSocket (`namespace: battle`): `join-battle`, `select-lead`, `ready`, `submit-action`.
- Motor de resolução de turno (`battle-engine`): cálculo de dano, efetividade de tipos, prioridade de movimento, consumo de PP, desmaio (fainted) e condição de vitória.
- Condições de status (paralisia, veneno, queimadura, sono, congelamento, confusão) e stat stages (-6 a +6).
- Logging estruturado e rate limiting no endpoint de batalha.

Mais detalhes de design em [`docs/battle-plan.md`](docs/battle-plan.md) e [`docs/battle-damage-and-status.md`](docs/battle-damage-and-status.md).

### Chat em tempo real

WebSocket (`namespace: chat`): `join-room`, `send-message`, `delete-message`, com salas e mensagens persistidas via Prisma.

## 📚 Documentação da API (Swagger)

A API é documentada com [Swagger/OpenAPI](https://docs.nestjs.com/openapi/introduction) via `@nestjs/swagger`. Com o servidor rodando, a documentação interativa fica disponível em:

```
http://localhost:3333/docs/swagger
```

Nela é possível ver todos os endpoints REST agrupados por módulo (Pokémon, My Pokémon, Moves, Pokémon Moves, Items, User, Battle), testar requisições diretamente pelo navegador e autenticar com o Bearer Token JWT (botão **Authorize**) para acessar as rotas protegidas.

## 🔐 Autenticação

Endpoints protegidos usam **Bearer Token (JWT)**. Faça login em `POST /auth/login` para obter o token e envie no header:

```
Authorization: Bearer <token>
```

Nos WebSockets (chat e battle), o token é enviado em `handshake.auth.token`.

## ⚙️ Variáveis de ambiente

Crie um `.env` na raiz com:

```env
DATABASE_URL=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=

PORT=3333
APP_URL=

EMAIL_USER=
EMAIL_PASS=
EMAIL_HOST=
EMAIL_PORT=
```

## 🚀 Rodando o projeto

### Pré-requisitos

- Node.js 22+
- MySQL/MariaDB rodando (local ou via Docker)

### Instalação

```bash
yarn install
```

### Banco de dados (Prisma)

```bash
npx prisma generate
npx prisma migrate dev
yarn seed          # popula pokémons, movimentos e itens a partir da PokéAPI
```

### Desenvolvimento

```bash
yarn dev            # watch mode
```

### Produção

```bash
yarn build
yarn start:prod
```

A API sobe por padrão em `http://localhost:3333`, com Swagger disponível em `/docs/swagger`.

## 🧪 Testes

```bash
yarn test           # unitários
yarn test:cov       # cobertura
yarn test:e2e       # end-to-end
```

## 🐳 Docker

```bash
# desenvolvimento
docker compose up -d

# produção
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

Documentação adicional de infraestrutura em `docs/`:
- [`docs/nginx-load-balancing.md`](docs/nginx-load-balancing.md)
- [`docs/nginx-static-files.md`](docs/nginx-static-files.md)
- [`docs/nginx-firebase-private-photos.md`](docs/nginx-firebase-private-photos.md)
- [`docs/vps-docker-log-cleanup.md`](docs/vps-docker-log-cleanup.md)

## 👤 Autor

**Lucas-191435** — [GitHub](https://github.com/Lucas-191435)
