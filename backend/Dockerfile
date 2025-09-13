# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
# Install deps with better cache
COPY package.json package-lock.json* ./
RUN npm ci || npm install
# Copy source
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
