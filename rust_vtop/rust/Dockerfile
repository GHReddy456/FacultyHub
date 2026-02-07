# Build stage
FROM rust:1.81-slim-bookworm as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire workspace to get access to lib and bin
COPY . .

# Build the server specifically
RUN cargo build --release --bin server

# Final stage
FROM debian:bookworm-slim

# Install runtime dependencies (SSL is required for VTOP/Captcha calls)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/server /usr/local/bin/vtop-server

# Port is provided by Render/Railway environment variable
EXPOSE 3001

CMD ["vtop-server"]
