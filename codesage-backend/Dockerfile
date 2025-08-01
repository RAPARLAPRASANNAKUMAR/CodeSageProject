# Use slim official OpenJDK base image
FROM openjdk:17-slim

# Set working directory inside the container
WORKDIR /app

# Copy the jar file into the container
COPY target/codesage-backend-0.0.1-SNAPSHOT.jar app.jar

# Expose the port your Spring Boot app runs on
EXPOSE 8080

# Run the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
