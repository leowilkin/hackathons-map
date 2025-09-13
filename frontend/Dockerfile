# Frontend Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
# Install deps with better cache
COPY package.json package-lock.json* ./
RUN npm ci || npm install
# Copy source
COPY . .
# Allow build-time API base override for CRA
ARG REACT_APP_API_BASE=http://backend:4000
ENV REACT_APP_API_BASE=$REACT_APP_API_BASE
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/build ./build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build"]
