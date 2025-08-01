# Use the official Go image, which comes with the compiler
FROM golang:latest

WORKDIR /app

# Copy the user's Go source file
COPY main.go .

# Compile and run the Go program
CMD ["go", "run", "main.go"]
