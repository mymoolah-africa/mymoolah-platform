#!/bin/bash
tar -czvf ~/mymoolah-backup-$(date +%Y%m%d-%H%M%S).tar.gz ~/mymoolah
echo "Backup complete: ~/mymoolah-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
  chmod +x ~/backup-mymoolah.sh