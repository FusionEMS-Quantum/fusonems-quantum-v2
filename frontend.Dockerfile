FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY public ./public
COPY tsconfig.json next.config.js ./

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
