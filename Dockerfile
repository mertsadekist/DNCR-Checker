FROM node:20-slim

# Install OpenSSL for Prisma, and curl for the container healthcheck
RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
COPY server/prisma/schema.prisma server/prisma/schema.prisma
RUN npm ci --include=dev

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Build frontend
RUN npm run build

# Expose port
EXPOSE 4000

# Start server with database setup
CMD ["sh", "-c", "npx prisma db push --schema=server/prisma/schema.prisma --skip-generate && npm run seed; exec node --import tsx server/index.ts"]
