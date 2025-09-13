# Frontend Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
# Install deps with better cache
COPY package.json package-lock.json* ./
RUN npm ci || npm install
# Copy source
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/build ./build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build"]
