# Use a slim, official OpenJDK base image
FROM openjdk:17-slim

# Set working directory inside the container
WORKDIR /app

# Copy the built Spring Boot jar into the container
COPY target/codesage-backend-0.0.1-SNAPSHOT.jar app.jar

# Expose Spring Boot default port
EXPOSE 8080

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
