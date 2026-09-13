# syntax=docker/dockerfile:1.7
# AlKÉ Finance back-office — static build served by nginx.
# The API base URL is baked at build time (Vite), so build one image per environment:
#   docker build --build-arg VITE_API_BASE_URL=https://api.staging.alke.finance -t alke-admin:staging .

FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
