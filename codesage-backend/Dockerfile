# Stage 1: Build the application using Maven
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /build
COPY . .
# Run Maven build from the correct subdirectory
RUN mvn -f codesage-backend/pom.xml clean install -DskipTests

# Stage 2: Create the final application image
FROM openjdk:17-slim

# Install necessary compilers and runtimes
# -y flag automatically answers yes to prompts
RUN apt-get update && apt-get install -y \
    python3 \
    nodejs \
    npm \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install TypeScript globally using npm
RUN npm install -g typescript

WORKDIR /app

# Copy the compiled .jar file from the 'build' stage
COPY --from=build /build/codesage-backend/target/*.jar app.jar

# Copy the Dockerfiles for the sandbox (even though we aren't using Docker runtime, the code expects them)
COPY codesage-backend/src/main/resources/dockerfiles ./dockerfiles

# Tell Render that your application will run on port 8080
EXPOSE 8080

# The command to run your application
ENTRYPOINT ["java", "-jar", "app.jar"]