# Coolify Persistent Volumes Setup Guide

## Overview

By default, files stored in a Docker container are lost when the container restarts or redeploys. To persist uploaded files (like ticket attachments), you need to configure a persistent volume in Coolify.

## What is a Persistent Volume?

A persistent volume is a directory on the host machine that is mounted into the container. Files written to this directory persist even when the container is recreated.

## Setup Steps

### Step 1: Access Your Application in Coolify

1. Log in to your Coolify dashboard
2. Navigate to **Projects** → **PFT Tickets** → **production** (your application)

### Step 2: Configure Persistent Storage

1. Click on your application
2. Go to the **"Storages"** tab (or **"Volumes"** depending on Coolify version)
3. Click **"Add Storage"** or **"Add Volume"**

### Step 3: Add Volume Configuration

Configure the volume with these settings:

**Volume Name:** `ticket-uploads`

**Source Path (Host):** `/var/lib/coolify/volumes/pft-tickets/uploads`
- This is where files will be stored on the Coolify server
- Coolify will create this directory automatically

**Destination Path (Container):** `/app/public/uploads`
- This is where the volume will be mounted inside your container
- Must match the path in your application code

**Options:**
- ✅ Enable "Persistent"
- ✅ Enable "Read/Write" (not read-only)

### Step 4: Save and Redeploy

1. Click **"Save"** or **"Add Volume"**
2. Click **"Deploy"** to restart your application with the new volume

### Step 5: Verify the Volume

After deployment, verify the volume is working:

1. Go to **Terminal** tab in Coolify
2. Connect to your application container
3. Run these commands:

```bash
# Check if the volume is mounted
ls -la /app/public/uploads

# Create a test file
echo "test" > /app/public/uploads/test.txt

# Verify it exists
cat /app/public/uploads/test.txt
```

4. Redeploy your application
5. Check if the test file still exists (it should!)

## Volume Configuration Examples

### Example 1: Basic Upload Storage

```yaml
Source: /var/lib/coolify/volumes/pft-tickets/uploads
Destination: /app/public/uploads
```

### Example 2: Multiple Volumes

If you want to separate different types of uploads:

**Ticket Images:**
```yaml
Source: /var/lib/coolify/volumes/pft-tickets/ticket-images
Destination: /app/public/uploads/tickets
```

**User Avatars (future):**
```yaml
Source: /var/lib/coolify/volumes/pft-tickets/avatars
Destination: /app/public/uploads/avatars
```

## Important Notes

### 1. Permissions

The container user must have write permissions to the volume. If you encounter permission errors:

```bash
# On the Coolify server (SSH)
sudo chown -R 1000:1000 /var/lib/coolify/volumes/pft-tickets/uploads
sudo chmod -R 755 /var/lib/coolify/volumes/pft-tickets/uploads
```

### 2. Backup Strategy

Persistent volumes are stored on the Coolify server. Make sure to:

- **Regular Backups:** Set up automated backups of `/var/lib/coolify/volumes/`
- **Off-site Backups:** Copy backups to a different server or cloud storage
- **Test Restores:** Periodically test that you can restore from backups

### 3. Disk Space Monitoring

Monitor disk usage to prevent running out of space:

```bash
# Check disk usage
df -h /var/lib/coolify/volumes/

# Check upload directory size
du -sh /var/lib/coolify/volumes/pft-tickets/uploads
```

### 4. Scaling Considerations

**Single Server:**
- Persistent volumes work great for single-server deployments
- All uploads are stored on one machine

**Multi-Server (Future):**
- If you scale to multiple servers, consider:
  - **Shared Network Storage:** NFS, GlusterFS, or Ceph
  - **Cloud Storage:** AWS S3, Cloudflare R2, DigitalOcean Spaces
  - **Database Storage:** Store small files as BLOBs (not recommended for images)

## Troubleshooting

### Issue: Files Disappear After Deployment

**Cause:** Volume not configured or mounted incorrectly

**Solution:**
1. Check that the volume is listed in Coolify's Storages tab
2. Verify the destination path matches your code: `/app/public/uploads`
3. Redeploy the application

### Issue: Permission Denied Errors

**Cause:** Container user doesn't have write permissions

**Solution:**
```bash
# SSH into Coolify server
ssh user@your-coolify-server

# Fix permissions
sudo chown -R 1000:1000 /var/lib/coolify/volumes/pft-tickets/uploads
sudo chmod -R 755 /var/lib/coolify/volumes/pft-tickets/uploads
```

### Issue: Volume Not Mounting

**Cause:** Incorrect path or Coolify configuration issue

**Solution:**
1. Check Coolify logs for mount errors
2. Verify the source path exists on the host
3. Try removing and re-adding the volume
4. Restart the Coolify service: `sudo systemctl restart coolify`

## Migration from Existing Uploads

If you already have uploads in the container, migrate them to the persistent volume:

```bash
# 1. Connect to container terminal in Coolify
cd /app/public

# 2. Check if uploads exist
ls -la uploads/

# 3. After adding the volume and redeploying, uploads will be empty
# 4. You'll need to re-upload files or restore from a backup
```

## Alternative: Cloud Storage (Recommended for Production)

For production environments, consider using cloud storage instead of persistent volumes:

### Advantages:
- ✅ Automatic backups and redundancy
- ✅ Scales horizontally across multiple servers
- ✅ CDN integration for faster delivery
- ✅ No disk space concerns
- ✅ Better disaster recovery

### Popular Options:
1. **AWS S3** - Industry standard, pay-as-you-go
2. **Cloudflare R2** - S3-compatible, no egress fees
3. **DigitalOcean Spaces** - Simple, affordable
4. **Backblaze B2** - Very affordable for large storage

### Implementation:
- Use `@aws-sdk/client-s3` for S3-compatible storage
- Update upload API to save to cloud instead of filesystem
- Store URLs in database pointing to cloud storage

## Summary

**For Development/Small Production:**
- ✅ Use Coolify persistent volumes
- Simple setup, no additional costs
- Good for single-server deployments

**For Large Production:**
- ✅ Use cloud storage (S3, R2, etc.)
- Better scalability and reliability
- Recommended for multi-server setups

## Next Steps

1. ✅ Add persistent volume in Coolify
2. ✅ Redeploy application
3. ✅ Test file upload and persistence
4. ✅ Set up backup strategy
5. ⏭️ (Optional) Migrate to cloud storage later

---

**Need Help?**
- Coolify Documentation: https://coolify.io/docs
- Coolify Discord: https://discord.gg/coolify
