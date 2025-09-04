FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Merge multi-file Prisma schema
RUN npx ts-node scripts/merge-prisma.ts

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
