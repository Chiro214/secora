# Go Scan Engine Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /build

# Copy source
COPY main.go .

# Build
RUN go build -o scan-engine main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy binary
COPY --from=builder /build/scan-engine .

# Make executable
RUN chmod +x scan-engine

# Expose port (optional, for HTTP service)
EXPOSE 8080

# Run scanner as service (optional)
# For now, it's called by backend via exec
CMD ["./scan-engine"]
