# Dockerfile for SKYFLIXER ADMIN BOT on Hugging Face Spaces
# SDK: docker
FROM node:18-slim

ENV BOT_TOKEN=""
ENV ADMIN_ID=""
ENV ADMIN_USERNAME=""

WORKDIR /app

COPY --chown=node:node ./package.json package.json
RUN npm install --production

COPY --chown=node:node . /app

USER node

CMD ["node", "server.js"]
