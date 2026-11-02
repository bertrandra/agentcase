#!/usr/bin/env bash
# FX-32: read AgentCase's MS Project XML samples with MPXJ (the library ProjectLibre opens MS Project files with) and check they are read as
# written (tools/mspdi/MspdiCheck.java). MPXJ's jars come from its pinned Python wheel (no Maven needed); Java 11+ runs the check as a single file.
set -euo pipefail
cd "$(dirname "$0")/.."
MPXJ_VERSION=16.10.0
dir="${MPXJ_DIR:-${RUNNER_TEMP:-/tmp}/mpxj-$MPXJ_VERSION}"
if [ ! -d "$dir/mpxj/lib" ]; then
  mkdir -p "$dir"
  python3 -m pip download "mpxj==$MPXJ_VERSION" --no-deps -d "$dir" -q
  python3 -m zipfile -e "$dir"/mpxj-"$MPXJ_VERSION"-*.whl "$dir"
fi
java -cp "$dir/mpxj/lib/*" tools/mspdi/MspdiCheck.java app/fixtures/msproject/*.xml
