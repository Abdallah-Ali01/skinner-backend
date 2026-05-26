# VPS Deployment Info

## Server Details
- **Provider:** Hostinger
- **Hostname:** srv1634946.hstgr.cloud
- **IP:** 187.127.227.63
- **OS:** Ubuntu 24.04 LTS
- **User:** root

## SSH Access
```bash
ssh root@srv1634946.hstgr.cloud
```

## Project Path on VPS
```
/var/www/skinner-backend/
```

## Quick Deploy (from SSH)
```bash
cd /var/www/skinner-backend && git pull && pm2 restart skinner-backend
```

## Services
| Service | Manager | Unit / Name | Port |
|---------|---------|-------------|------|
| Node.js Backend | PM2 | skinner-backend | 5000 |
| AI (Skin Disease) | systemd | skinner-ai | 8000 |
| Chatbot (RAG) | systemd | skinner-chatbot | 8001 |

## Restart Commands
```bash
pm2 restart skinner-backend
sudo systemctl restart skinner-ai
sudo systemctl restart skinner-chatbot
```

## Check Status
```bash
pm2 status skinner-backend
sudo systemctl status skinner-ai
sudo systemctl status skinner-chatbot
```

## View Logs
```bash
pm2 logs skinner-backend
sudo journalctl -u skinner-ai -f
sudo journalctl -u skinner-chatbot -f
```
