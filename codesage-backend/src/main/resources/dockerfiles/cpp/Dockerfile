# Use a standard C++ compiler image
FROM gcc:latest

WORKDIR /app

# Copy the user's C++ source file
COPY script.cpp .

# Compile the code and then run the resulting executable
CMD ["sh", "-c", "g++ script.cpp -o myapp && ./myapp"]