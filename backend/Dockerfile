FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /workspace/backend
COPY backend/.mvn/ .mvn/
COPY backend/mvnw backend/pom.xml ./
RUN chmod +x mvnw
COPY backend/src/ src/
COPY mobile/www/ /workspace/mobile/www/
RUN RUN_POSTGRES_INTEGRATION=false ./mvnw -B clean verify

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 appuser
COPY --from=build --chown=10001:10001 /workspace/backend/target/gestion-asignaturas-api-0.0.1-SNAPSHOT.jar /app/app.jar
USER 10001:10001
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
