FROM golang:1.26.4-alpine AS build
WORKDIR /src
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /edunexus ./apps/api
FROM alpine:3.22
RUN apk add --no-cache ca-certificates tzdata docker-cli && addgroup -g 10001 edunexus && adduser -D -u 10001 -G edunexus edunexus && mkdir -p /app/uploads && chown -R edunexus:edunexus /app
WORKDIR /app
COPY --from=build /edunexus /usr/local/bin/edunexus
USER edunexus
EXPOSE 8080
CMD ["edunexus"]
