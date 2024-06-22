# en este archivo no se hace el prisma migrat porque se hace en el archivo de docker-compose.yml
# en este archiv no se puede hacer el prisma generate porque en este momento no se tiene la base de datos creada
# la migracion se hace atravez de package.json en el comando start fue modificado

FROM node:21-alpine3.19

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./


RUN npm install

COPY . .

EXPOSE 3002