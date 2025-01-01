# Parent image
FROM node:20

# Set environtment variables
ENV PORT = 5532

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy local code to the container image
COPY . .

# Expose the port the app runs on
EXPOSE 5532

# Run the web service on container startup
CMD ["npm", "run", "start"]