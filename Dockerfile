FROM node:22-alpine AS builder

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install

COPY . .

RUN npx prisma generate
RUN yarn build

FROM node:22-alpine

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
