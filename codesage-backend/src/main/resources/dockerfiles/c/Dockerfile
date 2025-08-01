# Use a standard C compiler image
FROM gcc:latest

WORKDIR /app

# Copy the user's C source file
COPY script.c .

# Compile the code and then run the resulting executable
CMD ["sh", "-c", "gcc script.c -o myapp && ./myapp"]