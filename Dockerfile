# Dockerfile for SKYFLIXER ADMIN BOT on Hugging Face Spaces
# SDK: docker
FROM node:18-slim

ENV BOT_TOKEN=""
ENV ADMIN_ID=""
ENV ADMIN_USERNAME=""

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

WORKDIR /app

COPY --chown=user ./package.json package.json
RUN npm install --production

COPY --chown=user . /app

CMD ["node", "server.js"]
