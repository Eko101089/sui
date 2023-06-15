#!/bin/bash
# Copyright (c) Mysten Labs, Inc.
# SPDX-License-Identifier: Apache-2.0

# Function to handle SIGINT signal (Ctrl+C)
cleanup() {
    echo "Cleaning up child processes..."
    # Kill all child processes in the process group of the current script
    kill -- "-$$"
    exit 1
}

# Set up the signal handler
trap cleanup SIGINT

if [ -z "$NUM_CPUS" ]; then
  NUM_CPUS=$(cat /proc/cpuinfo | grep processor | wc -l) # ubuntu
fi

# filter out some tests that give spurious failures.
TEST_FILTER="(not test(~batch_verification_tests))"

DATE=$(date +%s)
SEED="$DATE"

# create logs directory
SIMTEST_LOGS_DIR=~/simtest_logs
[ ! -d ${SIMTEST_LOGS_DIR} ] && mkdir -p ${SIMTEST_LOGS_DIR}
[ ! -d ${SIMTEST_LOGS_DIR}/${DATE} ] && mkdir -p ${SIMTEST_LOGS_DIR}/${DATE}

LOG_DIR="${SIMTEST_LOGS_DIR}/${DATE}"
LOG_FILE="$LOG_DIR/log"

# This command runs many different tests, so it already uses all CPUs fairly efficiently, and
# don't need to be done inside of the for loop below.
# TODO: this logs directly to stdout since it is not being run in parallel. is that ok?
MSIM_TEST_SEED="$SEED" \
MSIM_WATCHDOG_TIMEOUT_MS=60000 \
MSIM_TEST_NUM=30 \
scripts/simtest/cargo-simtest simtest \
  --color always \
  --test-threads "$NUM_CPUS" \
  --package sui-core \
  --package sui-archival \
  --package sui-e2e-tests \
  --profile simtestnightly \
  -E "$TEST_FILTER" 2>&1 | tee "$LOG_FILE"

for SUB_SEED in `seq 1 $NUM_CPUS`; do
  SEED="$SUB_SEED$DATE"
  LOG_FILE="$LOG_DIR/log-$SEED"
  echo "Iteration $SUB_SEED using MSIM_TEST_SEED=$SEED, logging to $LOG_FILE"

  # --test-threads 1 is important: parallelism is achieved via the for loop
  MSIM_TEST_SEED="$SEED" \
  MSIM_TEST_NUM=1 \
  MSIM_WATCHDOG_TIMEOUT_MS=60000 \
  SIM_STRESS_TEST_DURATION_SECS=300 \
  scripts/simtest/cargo-simtest simtest \
    --color always \
    --package sui-benchmark \
    --test-threads 1 \
    --profile simtestnightly \
    > "$LOG_FILE" 2>&1 &

done

# wait for all the jobs to end
wait

! grep -Hn FAIL "$LOG_DIR"/*
