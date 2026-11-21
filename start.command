#!/bin/bash
cd "$(dirname "$0")"
./build.sh
node server.js
