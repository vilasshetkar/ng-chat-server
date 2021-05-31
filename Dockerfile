FROM node:14

# Create app directory
WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000
CMD [ "node", "index.js" ]