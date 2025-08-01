# Stage 2: Run the application
FROM openjdk:17-slim
WORKDIR /app

# Install required libraries (JNA and bash are common needs)
RUN apt-get update && apt-get install -y \
    libjna-java \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
