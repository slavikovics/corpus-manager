FROM node:25-alpine AS development

WORKDIR /app

COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY index.html ./

RUN npm ci

COPY src ./src
COPY public ./public

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:25-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
