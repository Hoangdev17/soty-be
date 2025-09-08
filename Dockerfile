FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

RUN npm run build
EXPOSE 3000
CMD ["node", "dist/main.js"]
