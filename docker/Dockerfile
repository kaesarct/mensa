FROM node:22-bookworm-slim AS base
WORKDIR /app

# Solo i package.json per sfruttare la cache dei layer Docker: `npm install`
# viene invalidato solo quando cambiano le dipendenze, non ad ogni modifica al codice.
COPY package.json ./
COPY web/package.json web/package.json
COPY functions/package.json functions/package.json
COPY firestore-tests/package.json firestore-tests/package.json
COPY scripts/package.json scripts/package.json
COPY .npmrc ./

RUN npm install

COPY . .

# Stage usato dal servizio "firebase": aggiunge la JRE (richiesta dagli emulatori
# Firestore/Pub-Sub, distribuiti come JAR) e pre-scarica i binari degli emulatori
# in fase di build, non ad ogni `docker compose up`. Debian bookworm ha solo
# OpenJDK 17 in repo (anche coi backports): firebase-tools richiede almeno la 21,
# quindi la JRE viene copiata dall'immagine ufficiale Eclipse Temurin invece di
# passare per apt.
FROM eclipse-temurin:21-jre-jammy AS jre

FROM base AS firebase

COPY --from=jre /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

RUN npx firebase-tools setup:emulators:firestore \
  && npx firebase-tools setup:emulators:pubsub \
  && npx firebase-tools setup:emulators:ui \
  && npx firebase-tools setup:emulators:storage
