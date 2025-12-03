#!/bin/bash

# Quick test with EXACT password provided
PASSWORD="B0t3s@Mymoolahstaging"
export PGPASSWORD="$PASSWORD"

echo "Testing with password: $PASSWORD"
psql -h 127.0.0.1 -p 6544 -U mymoolah_app -d mymoolah_staging -c "SELECT current_database(), current_user;"
