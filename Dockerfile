FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json and prisma schema
COPY package.json ./
COPY prisma ./prisma/

# Install dependencies with npm (avoids pnpm supply-chain checks in CI builds)
RUN npm install --legacy-peer-deps

# Copy source and generate client / build
COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /app

# Copy built output and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/main.js"]
