# This stage uses a Maven image to compile your Java code into a .jar file.
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /build
# Copy the entire repository content
COPY . .
# Explicitly tell Maven where to find the pom.xml inside the project folder
RUN mvn -f codesage-backend/pom.xml clean install -DskipTests

# Stage 2: Create the final, smaller image for running the application
# This stage uses a lightweight Java image to run the compiled code.
FROM openjdk:17-slim
WORKDIR /app

# Copy the compiled .jar file from the correct target directory in the 'build' stage
COPY --from=build /build/codesage-backend/target/*.jar app.jar

# Tell Render that your application will run on port 8080
EXPOSE 8080

# The command to run your application
ENTRYPOINT ["java", "-jar", "app.jar"]