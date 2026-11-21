#!/bin/bash
set -e
cd "$(dirname "$0")"
mkdir -p data
touch data/scores.txt
cc -std=c11 -Wall -Wextra -pedantic -O2 src/quizmaster.c -o quizmaster
printf '\nBuild successful. Run: node server.js\n'
