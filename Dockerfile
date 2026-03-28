FROM node:22-alpine
# NOTE: For local development, it is recommended to mount the source code as a volume:
# docker run -p 5173:5173 -v $(pwd):/app -v /app/node_modules <image-name>
# needed to run gemini cli
RUN apk add coreutils libsecret

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Install gemini
RUN npm install -g "@google/gemini-cli"

# Copy the rest of the application
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host"]
