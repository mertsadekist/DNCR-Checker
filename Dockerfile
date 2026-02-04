FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=server/prisma/schema.prisma

# Build frontend
RUN npm run build

# Expose port
EXPOSE 4000

# Start server
CMD ["npm", "run", "start"]
