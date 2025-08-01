# Stage 1: Build the application using Maven
# This stage uses a Maven image to compile your Java code into a .jar file.
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /build
COPY . .
# Run Maven build from the correct subdirectory
RUN mvn -f codesage-backend/pom.xml clean install -DskipTests

# Stage 2: Create the final application image with all languages installed
FROM openjdk:17-slim

# Install necessary compilers and runtimes
# The -y flag automatically answers yes to prompts
RUN apt-get update && apt-get install -y \
    python3 \
    nodejs \
    npm \
    gcc \
    g++ \
    golang \
    rustc \
    && rm -rf /var/lib/apt/lists/*

# Install TypeScript globally using npm
RUN npm install -g typescript

WORKDIR /app

# Copy the compiled .jar file from the 'build' stage
COPY --from=build /build/codesage-backend/target/*.jar app.jar

# Tell Render that your application will run on port 8080
EXPOSE 8080

# The command to run your application
ENTRYPOINT ["java", "-jar", "app.jar"]