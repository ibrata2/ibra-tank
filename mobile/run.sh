#!/usr/bin/env bash
# يشغّل أمر البناء، وإذا فشل يطلع آخر سطور الخطأ كتنبيه واضح بصفحة Actions
NAME="$1"; shift
LOG="${RUNNER_TEMP:-/tmp}/step-$$.log"
set -o pipefail
if "$@" 2>&1 | tee "$LOG" | tail -n 40; then exit 0; fi
MSG=$( (grep -iE "error|FAILED|What went wrong|not found|cannot|denied" "$LOG" | tail -n 25; echo '--- tail ---'; tail -n 25 "$LOG") | cut -c1-300 | sed 's/%/%25/g' | sed ':a;N;$!ba;s/\n/%0A/g')
echo "::error title=$NAME::$MSG"
exit 1
