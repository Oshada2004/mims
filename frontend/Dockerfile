FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --include=optional --no-package-lock

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
