#!/usr/bin/env sh
# Renders envoy.yaml.template from CONTROLLER_GRPC_URL, then hands over to the
# image's own entrypoint (which drops privileges to the envoy user).
#
#   CONTROLLER_GRPC_URL     https://host[:port] (TLS, default 443) or
#                           http://host[:port]  (plaintext h2c, default 80)
#   CORS_ALLOWED_ORIGINS    regex matched against the Origin header (default: any)
set -eu

: "${CONTROLLER_GRPC_URL:?CONTROLLER_GRPC_URL is required, e.g. https://controller.example.org}"
CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-.*}"

scheme="${CONTROLLER_GRPC_URL%%://*}"
hostport="${CONTROLLER_GRPC_URL#*://}"
hostport="${hostport%%/*}"
host="${hostport%%:*}"
port="${hostport#"$host"}"
port="${port#:}"

case "$scheme" in
  https) port="${port:-443}" ;;
  http) port="${port:-80}" ;;
  *) echo "CONTROLLER_GRPC_URL must start with http:// or https://" >&2; exit 1 ;;
esac

# Host header for the upstream; the port is implied when it is the scheme default.
authority="$host"
if { [ "$scheme" = https ] && [ "$port" != 443 ]; } || { [ "$scheme" = http ] && [ "$port" != 80 ]; }; then
  authority="$host:$port"
fi

out=/tmp/envoy.yaml
sed \
  -e "s|__CONTROLLER_HOST__|$host|g" \
  -e "s|__CONTROLLER_PORT__|$port|g" \
  -e "s|__CONTROLLER_AUTHORITY__|$authority|g" \
  -e "s|__CORS_ALLOWED_ORIGINS__|$CORS_ALLOWED_ORIGINS|g" \
  /etc/envoy/envoy.yaml.template > "$out"

if [ "$scheme" = http ]; then
  sed -i '/# BEGIN TLS/,/# END TLS/d' "$out"
fi

echo "envoy: proxying gRPC-Web on :8080 to $scheme://$host:$port"
exec /docker-entrypoint.sh envoy -c "$out" "$@"
