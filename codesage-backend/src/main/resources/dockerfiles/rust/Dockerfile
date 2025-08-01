# Use the official Rust image, which comes with the compiler
FROM rust:latest

WORKDIR /app

# Copy the user's Rust source file
COPY main.rs .

# Compile the code and then run the resulting executable
CMD ["sh", "-c", "rustc main.rs && ./main"]
