#!/usr/bin/env bash
# Deploys this checkout to $DEPLOY_PATH/deployments on this host (ADR 0026,
# docs/features/develop-deployment). Run by the deploy-develop job of ci.yml on
# the self-hosted runner; also runnable by hand from a checkout:
#   DEPLOY_PATH=/opt/surimi-modelgui-develop .github/scripts/deploy.sh
#
# 1. What changed: git diff between the commit last deployed
#    ($DEPLOY_PATH/deployments/.deployed-commit) and HEAD.
# 2. Builds the backend and/or web image on this host (docker build), tagged
#    :$DEPLOY_TAG (develop, what compose runs) and :<commit> (rollback). A
#    service rolls only when its :develop image id changed (an identical rebuild
#    rolls nothing), or when its container does not run that image.
# 3. Copies compose.yml, .env.example and mounts/ where their content differs.
#    Never .env: it holds the server's secrets; only BACKEND_TAG / WEB_TAG are
#    set to $DEPLOY_TAG when they say something else (e.g. after a rollback).
# 4. Rolls only the services whose image or mounted files changed (the whole
#    stack, reconciled by compose, when compose.yml changed), waits for the API.
# 5. Records the commit; hands everything under DEPLOY_PATH to DEPLOY_OWNER;
#    keeps DEPLOY_KEEP_IMAGES commit tags per image and a week of build cache.
#
# Files are written as the runner user, or through `sudo -n` when that user
# cannot write DEPLOY_PATH (or read the .env); docker runs through `sudo -n`
# when the runner user is not in the docker group.
#
# Environment: DEPLOY_PATH (required), DEPLOY_TAG (default develop),
# DEPLOY_OWNER (default deployer:deployer),
# FORCE_ALL=true (rebuild and redeploy everything), DEPLOY_KEEP_IMAGES (default
# 5), API_HEALTH_TIMEOUT (seconds, default 300).

set -euo pipefail

: "${DEPLOY_PATH:?set DEPLOY_PATH (GitHub environment variable of "develop")}"
OWNER="${DEPLOY_OWNER:-deployer:deployer}"
DEPLOY_TAG="${DEPLOY_TAG:-develop}" # the tag compose runs on this server
FORCE_ALL="${FORCE_ALL:-false}"
KEEP="${DEPLOY_KEEP_IMAGES:-5}"
HEALTH_TIMEOUT="${API_HEALTH_TIMEOUT:-300}"

REPO="$(git rev-parse --show-toplevel)"
SHA="$(git -C "$REPO" rev-parse HEAD)"
TAG="${SHA:0:12}" # commit tag, kept for rollback
SRC="$REPO/deployments"
TARGET="$DEPLOY_PATH/deployments"
ENV_FILE="$TARGET/.env"
MARK="$TARGET/.deployed-commit"

log() { echo "==> $*"; }
warn() { echo "::warning::$*"; }
die() { echo "::error::$*"; exit 1; }

# Paths whose change means a new image (keep in step with ci.yml's filters).
BACKEND_PATHS='^(apps/backend/|packages/proto/|pyproject\.toml$|uv\.lock$|\.python-version$|\.dockerignore$)'
WEB_PATHS='^(apps/frontend/|package\.json$|package-lock\.json$|deployments/nginx/|\.dockerignore$|\.nvmrc$)'
BACKEND_SERVICES="migrate api worker"
WEB_SERVICES="web"

# --- privileges ---------------------------------------------------------------------
# AS runs file operations under DEPLOY_PATH: empty when this user may write there,
# "sudo -n" otherwise (passwordless sudo). DOCKER likewise for the docker socket.
AS=""
if [ "$(id -u)" -ne 0 ]; then
  probe="$DEPLOY_PATH"
  while [ ! -e "$probe" ]; do probe="$(dirname "$probe")"; done
  if [ ! -w "$probe" ] || { [ -e "$ENV_FILE" ] && [ ! -r "$ENV_FILE" ]; } \
     || { [ -d "$TARGET" ] && [ ! -w "$TARGET" ]; }; then
    sudo -n true 2>/dev/null || die "$(id -un) cannot write $DEPLOY_PATH and has no passwordless sudo"
    AS="sudo -n"
  fi
fi
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  sudo -n docker info >/dev/null 2>&1 || die "$(id -un) cannot use Docker: add it to the docker group, or allow sudo docker"
  DOCKER="sudo -n docker"
fi
as() { $AS "$@"; }
dk() { $DOCKER "$@"; }
write() { as tee "$1" >/dev/null; } # stdin -> file $1

as mkdir -p "$TARGET"

copy_if_changed() { # $1 = source file, $2 = target file; prints "changed" if copied
  if ! as cmp -s "$1" "$2" 2>/dev/null; then
    as mkdir -p "$(dirname "$2")"
    as cp "$1" "$2" # onto an existing file: same inode, so a file bind mount sees it
    if [ -x "$1" ]; then as chmod +x "$2"; fi
    echo changed
  fi
}

if [ -n "$(copy_if_changed "$SRC/.env.example" "$TARGET/.env.example")" ]; then log ".env.example updated"; fi
if ! as test -f "$ENV_FILE"; then
  as chown -R "$OWNER" "$TARGET" 2>/dev/null || warn "chown $OWNER $TARGET failed"
  die "no $ENV_FILE yet. Create it from $TARGET/.env.example with real secrets (JWT_SECRET, DB_PASSWORD, POSTGRES_PASSWORD, METRICS_TOKEN, OIDC_*, S3_*), COMPOSE_PROJECT_NAME and COMPOSE_PROFILES, owned by $OWNER, then re-run the job"
fi

read_var() { # $1 = key; the value without surrounding quotes, empty when absent
  local v
  v="$(as grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true)"
  v="${v%\"}"; v="${v#\"}"
  printf '%s' "$v"
}
set_var() { # $1 = key, $2 = value (a tag: no characters sed would read)
  if as grep -q "^$1=" "$ENV_FILE"; then
    as sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$1" "$2" | as tee -a "$ENV_FILE" >/dev/null
  fi
}
stamp() { # $1 = key: a comment above it saying which commit the image under it is
  set_var "$1" "$DEPLOY_TAG" # so the comment has a line to sit above
  as sed -i "/^# $1 set by CI: /d" "$ENV_FILE"
  as sed -i "/^$1=/i # $1 set by CI: :$DEPLOY_TAG is commit $SHA ($TAG), built $(date -u +%Y-%m-%dT%H:%M:%SZ), run ${GITHUB_RUN_ID:-manual}" "$ENV_FILE"
}

BACKEND_IMAGE="$(read_var BACKEND_IMAGE)"; BACKEND_IMAGE="${BACKEND_IMAGE:-ghcr.io/surimi-project/surimi-modelgui-backend-api}"
WEB_IMAGE="$(read_var WEB_IMAGE)"; WEB_IMAGE="${WEB_IMAGE:-ghcr.io/surimi-project/surimi-modelgui-web}"

# --- 1. what changed --------------------------------------------------------------
PREV="$(as cat "$MARK" 2>/dev/null || true)"
ALL=false
if [ "$FORCE_ALL" = "true" ]; then
  log "redeploy everything (manual run)"; ALL=true
elif [ -z "$PREV" ]; then
  log "first deploy into $TARGET"; ALL=true
elif ! git -C "$REPO" cat-file -e "$PREV^{commit}" 2>/dev/null; then
  warn "deployed commit $PREV is not in this checkout (fetch-depth 0? force push?): redeploying everything"; ALL=true
fi

if [ "$ALL" = "true" ]; then
  BUILD_BACKEND=true; BUILD_WEB=true
else
  CHANGED_FILES="$(git -C "$REPO" diff --name-only "$PREV" "$SHA")"
  log "changes since ${PREV:0:12}: $(printf '%s\n' "$CHANGED_FILES" | grep -c . || true) files"
  BUILD_BACKEND=false; BUILD_WEB=false
  if grep -qE "$BACKEND_PATHS" <<<"$CHANGED_FILES"; then BUILD_BACKEND=true; fi
  if grep -qE "$WEB_PATHS" <<<"$CHANGED_FILES"; then BUILD_WEB=true; fi
fi
# A pinned image that is not on this host (first deploy, pruned) is built too.
dk image inspect "$BACKEND_IMAGE:$DEPLOY_TAG" >/dev/null 2>&1 || BUILD_BACKEND=true
dk image inspect "$WEB_IMAGE:$DEPLOY_TAG" >/dev/null 2>&1 || BUILD_WEB=true
log "build: backend=$BUILD_BACKEND web=$BUILD_WEB"

# --- 2. build what changed; roll only what really changed ---------------------------
ROLL=""
add_roll() { local s; for s in $1; do case " $ROLL " in *" $s "*) ;; *) ROLL="$ROLL $s" ;; esac; done; }

build_image() { # $1 = Dockerfile, $2 = image, $3 = tag var in .env, $4 = services, $5... = build args
  local dockerfile="$1" image="$2" tagvar="$3" services="$4" new old
  shift 4
  # Read before building: the build moves :$DEPLOY_TAG.
  old="$(dk image inspect -f '{{.Id}}' "$image:$DEPLOY_TAG" 2>/dev/null || true)"
  log "building $image:$DEPLOY_TAG and :$TAG"
  # Context = repository root, as in compose.local.yml. --pull refreshes the base
  # images. No provenance or SBOM attestation: they carry a timestamp, so every
  # build would get a new id and roll although nothing changed.
  dk build --pull --provenance=false --sbom=false -f "$REPO/$dockerfile" "$@" -t "$image:$DEPLOY_TAG" -t "$image:$TAG" "$REPO"
  new="$(dk image inspect -f '{{.Id}}' "$image:$DEPLOY_TAG")"
  if [ "$new" = "$old" ]; then
    log "$image: identical to the deployed :$DEPLOY_TAG, nothing to roll"
  else
    stamp "$tagvar"
    add_roll "$services"
    log "$image: new :$DEPLOY_TAG (commit $TAG), rolling: $services"
  fi
}
MOCK="$(read_var MOCK)" # build arg of the web image; same default as compose.local.yml
if [ "$BUILD_BACKEND" = "true" ]; then
  build_image apps/backend/Dockerfile "$BACKEND_IMAGE" BACKEND_TAG "$BACKEND_SERVICES"
fi
if [ "$BUILD_WEB" = "true" ]; then
  build_image apps/frontend/Dockerfile "$WEB_IMAGE" WEB_TAG "$WEB_SERVICES" --build-arg "MOCK=${MOCK:-true}"
fi

# compose runs :$DEPLOY_TAG. A tag line that says something else (a rollback to a
# commit tag, or not set yet) is set back, and its services roll.
pin_tag() { # $1 = tag var, $2 = services
  if [ "$(read_var "$1")" != "$DEPLOY_TAG" ]; then
    log "$1 was '$(read_var "$1")': set to $DEPLOY_TAG"
    set_var "$1" "$DEPLOY_TAG"; add_roll "$2"
  fi
}
pin_tag BACKEND_TAG "$BACKEND_SERVICES"
pin_tag WEB_TAG "$WEB_SERVICES"

compose() { dk compose --project-directory "$TARGET" -f "$TARGET/compose.yml" "$@"; }

# A container that does not run its pinned image (changed by hand, or left by an
# earlier failed deploy) rolls as well.
check_running() { # $1 = service to look at, $2 = image:tag it should run, $3 = services to roll
  local want cid have
  want="$(dk image inspect -f '{{.Id}}' "$2" 2>/dev/null || true)"
  cid="$(compose ps -q "$1" 2>/dev/null || true)"
  if [ -z "$want" ] || [ -z "$cid" ]; then return 0; fi
  have="$(dk inspect -f '{{.Image}}' "$cid")"
  if [ "$have" != "$want" ]; then log "$1 runs another image than $2: rolling $3"; add_roll "$3"; fi
}
if as test -f "$TARGET/compose.yml"; then
  check_running api "$BACKEND_IMAGE:$DEPLOY_TAG" "$BACKEND_SERVICES"
  check_running web "$WEB_IMAGE:$DEPLOY_TAG" "$WEB_SERVICES"
fi

# --- 3. copy the deployment files that differ ---------------------------------------
COMPOSE_CHANGED=false
if [ -n "$(copy_if_changed "$SRC/compose.yml" "$TARGET/compose.yml")" ]; then
  COMPOSE_CHANGED=true; log "compose.yml updated"
fi

RECREATE=""
add_recreate() { case " $RECREATE " in *" $1 "*) ;; *) RECREATE="$RECREATE $1" ;; esac; }
mount_changed() { # $1 = path under mounts/: which service reads it
  case "$1" in
    postgres/*) add_recreate db-bootstrap ;;
    keycloak/*) add_recreate keycloak ;;
    observability/prometheus/*) add_recreate prometheus ;;
    observability/grafana/*) add_recreate grafana ;;
    *) warn "mounts/$1 changed and no service is mapped to it: reconciling the whole stack"; COMPOSE_CHANGED=true ;;
  esac
}
# mounts/ holds configuration from the repo, synced below, and runtime data
# folders (git-ignored), which the sync never copies, deletes or prunes.
# experiments/ is the local outputs folder compose mounts by default.
RUNTIME_DIRS="experiments"
is_runtime() { # $1 = path under mounts/
  local d; for d in $RUNTIME_DIRS; do case "$1" in "$d" | "$d"/*) return 0 ;; esac; done; return 1
}

# In place: files are copied over (same inode), files gone from the repo removed.
while IFS= read -r -d '' f; do
  rel="${f#"$SRC/mounts/"}"
  if is_runtime "$rel"; then continue; fi # a local working copy's data, not configuration
  if [ -n "$(copy_if_changed "$f" "$TARGET/mounts/$rel")" ]; then log "mounts/$rel updated"; mount_changed "$rel"; fi
done < <(find "$SRC/mounts" -type f -print0)
if as test -d "$TARGET/mounts"; then
  prune=(); for d in $RUNTIME_DIRS; do prune+=(-path "$TARGET/mounts/$d" -prune -o); done
  while IFS= read -r -d '' f; do
    rel="${f#"$TARGET/mounts/"}"
    if [ ! -e "$SRC/mounts/$rel" ]; then as rm -f "$f"; log "mounts/$rel removed"; mount_changed "$rel"; fi
  done < <(as find "$TARGET/mounts" "${prune[@]}" -type f -print0)
  # -delete works depth-first, where -prune has no effect: exclude by path instead.
  keep=(); for d in $RUNTIME_DIRS; do keep+=(-not -path "$TARGET/mounts/$d" -not -path "$TARGET/mounts/$d/*"); done
  as find "$TARGET/mounts" -mindepth 1 -type d -empty "${keep[@]}" -delete
fi

# The outputs folder, created here (and handed to DEPLOY_OWNER below) so Docker
# does not create it as root. Not when OUTPUTS_LOCAL_DIR points elsewhere.
if [ -z "$(read_var OUTPUTS_LOCAL_DIR)" ]; then as mkdir -p "$TARGET/mounts/experiments"; fi

# Everything this script wrote under DEPLOY_PATH belongs to DEPLOY_OWNER. The
# runtime data folders only get their top folder chowned: their content can be
# large and belongs to whoever writes it.
data_prune=(); for d in $RUNTIME_DIRS; do data_prune+=(-path "$TARGET/mounts/$d/*" -prune -o); done
as find "$TARGET" "${data_prune[@]}" -exec chown "$OWNER" {} + 2>/dev/null \
  || warn "chown $OWNER failed under $DEPLOY_PATH (does the user exist?): files left as $(id -un)"

# --- 4. roll ---------------------------------------------------------------------------
if [ "$ALL" = "true" ] || [ "$COMPOSE_CHANGED" = "true" ]; then
  log "reconciling the whole stack (compose recreates only what differs)"
  compose up -d --remove-orphans
elif [ -n "${ROLL// /}" ]; then
  # shellcheck disable=SC2086 # word splitting intended: a list of services
  log "rolling:$ROLL"; compose up -d $ROLL
fi
for service in $RECREATE; do
  if [ "$service" = "db-bootstrap" ]; then
    log "re-running db-bootstrap"; compose up -d db-bootstrap
  elif [ -n "$(compose ps -q --status running "$service")" ]; then
    log "recreating $service (its mounted files changed)"; compose up -d --force-recreate --no-deps "$service"
  else
    log "$service is not running (profile off): its files are updated for its next start"
  fi
done
if [ -z "${ROLL// /}" ] && [ -z "${RECREATE// /}" ] && [ "$COMPOSE_CHANGED" = "false" ] && [ "$ALL" = "false" ]; then
  log "no image, compose file or mounted file changed: nothing restarted"
fi

# --- wait for the API ----------------------------------------------------------------
if [ "$ALL" = "true" ] || [ "$COMPOSE_CHANGED" = "true" ] || [[ " $ROLL " == *" api "* ]]; then
  log "waiting up to ${HEALTH_TIMEOUT}s for api to be healthy"
  deadline=$((SECONDS + HEALTH_TIMEOUT)); state=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    cid="$(compose ps -q api)"
    if [ -n "$cid" ]; then
      state="$(dk inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
      if [ "$state" = "healthy" ]; then break; fi
    fi
    # The API starts only after migrate exits 0: a failed migrate is final.
    migrate="$(compose ps -aq migrate)"
    if [ -n "$migrate" ]; then
      read -r m_status m_code <<<"$(dk inspect -f '{{.State.Status}} {{.State.ExitCode}}' "$migrate")"
      if [ "$m_status" = "exited" ] && [ "$m_code" != "0" ]; then
        compose logs --tail 80 migrate; die "migrate failed (exit $m_code): the API was not started"
      fi
    fi
    sleep 5
  done
  if [ "$state" != "healthy" ]; then
    compose ps -a; compose logs --tail 80 migrate api
    die "api is not healthy after ${HEALTH_TIMEOUT}s (state: ${state:-no container}). The pins in $ENV_FILE point at the new images; set them back to roll back"
  fi
  log "api healthy"
fi

# --- 5. record, then prune -------------------------------------------------------------
echo "$SHA" | write "$MARK"
as chown "$OWNER" "$MARK" "$ENV_FILE" 2>/dev/null || true
log "deployed $SHA"

prune_tags() { # $1 = image, $2 = tag in use: keep it, local, latest, $DEPLOY_TAG and the newest $KEEP commit tags
  local image="$1" pinned="$2" kept=0 tag
  while read -r tag; do
    case "$tag" in "$pinned" | "$DEPLOY_TAG" | local | latest | "<none>") continue ;; esac
    [[ "$tag" =~ ^[0-9a-f]{12}$ ]] || continue
    if [ "$kept" -lt "$KEEP" ]; then kept=$((kept + 1)); continue; fi
    dk image rm "$image:$tag" >/dev/null && log "removed old image $image:$tag"
  done < <(dk image ls "$image" --format '{{.Tag}}') # newest first
}
prune_tags "$BACKEND_IMAGE" "$(read_var BACKEND_TAG)"
prune_tags "$WEB_IMAGE" "$(read_var WEB_TAG)"
dk image prune -f >/dev/null
dk builder prune -f --filter until=168h >/dev/null
log "pruned: $KEEP commit tags per image, dangling images, build cache older than 7 days"
compose ps
