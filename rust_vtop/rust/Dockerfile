# Build stage
FROM rust:1.81-slim-bookworm as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    lld \
    clang \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the entire workspace
COPY . .

# Optimize for low-memory environment
ENV RUSTFLAGS="-C link-arg=-fuse-ld=lld"
ENV CARGO_INCREMENTAL=0

# Build the server specifically
# -j 1 limits parallel jobs to save RAM
RUN cargo build --release --bin server -j 1

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
