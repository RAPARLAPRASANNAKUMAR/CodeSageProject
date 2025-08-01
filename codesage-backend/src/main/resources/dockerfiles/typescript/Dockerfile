# Use an official Node.js image which includes npm
FROM node:18-slim

WORKDIR /app

# Install the TypeScript compiler globally inside the container
RUN npm install -g typescript

# Copy the user's TypeScript source file
COPY script.ts .

# Compile the TypeScript to JavaScript, and then run the JS file with Node
CMD ["sh", "-c", "tsc script.ts && node script.js"]