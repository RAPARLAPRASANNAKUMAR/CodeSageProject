# Use a slim, official OpenJDK base image
FROM openjdk:17-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the user's Java source file into the container
COPY Main.java .

# Compile the java code and then execute it.
# This command is run when the container starts.
CMD ["sh", "-c", "javac Main.java && java Main"]
