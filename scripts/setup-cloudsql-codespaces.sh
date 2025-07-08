#!/bin/bash
# setup-cloudsql-codespaces.sh
# Automates secure Cloud SQL access setup in GitHub Codespaces

set -e

# Configurable variables
PROJECT_ID="mymoolah-db"
INSTANCE_CONNECTION="mymoolah-db:africa-south1:mymoolah-instance"
PROXY_PORT=3306

# 1. Install Google Cloud SDK if not present
if ! command -v gcloud &> /dev/null; then
  echo "Installing Google Cloud SDK..."
  curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-470.0.0-linux-x86_64.tar.gz
  tar -xzf google-cloud-sdk-470.0.0-linux-x86_64.tar.gz
  ./google-cloud-sdk/install.sh --quiet
  source ./google-cloud-sdk/path.bash.inc
fi

# 2. Install MySQL client if not present
if ! command -v mysql &> /dev/null; then
  echo "Installing MySQL client..."
  sudo apt-get update && sudo apt-get install -y mysql-client
fi

# 3. Download Cloud SQL Auth Proxy v2 if not present
if [ ! -f ./cloud-sql-proxy ]; then
  echo "Downloading Cloud SQL Auth Proxy v2..."
  curl -Lo cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.10.1/cloud-sql-proxy.linux.amd64
  chmod +x cloud-sql-proxy
fi

# 4. Authenticate with Google Cloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
  echo "Please log in to Google Cloud (browser window will open):"
  gcloud auth login
fi

echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

echo "Setting up Application Default Credentials (browser window will open):"
gcloud auth application-default login

# 5. Kill any existing proxy on the port
if lsof -i :$PROXY_PORT &> /dev/null; then
  echo "Killing existing process on port $PROXY_PORT..."
  kill $(lsof -t -i :$PROXY_PORT)
fi

# 6. Start the Cloud SQL Auth Proxy
./cloud-sql-proxy --address 127.0.0.1 --port $PROXY_PORT $INSTANCE_CONNECTION &

sleep 2
echo "Cloud SQL Auth Proxy started on 127.0.0.1:$PROXY_PORT"
echo "You can now connect using:"
echo "  mysql --host=127.0.0.1 --user=YOUR_USER --password --database=YOUR_DB -e 'SHOW TABLES;'" 