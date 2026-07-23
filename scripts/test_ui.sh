#!/bin/sh

PLAYWRIGHT_RETRY=4 npm run test:ui
status=$?

if [ "$status" -ne 0 ] && [ "$status" -ne 130 ]; then
  npm run test:ui:retry -- maxAttempts=4
fi
