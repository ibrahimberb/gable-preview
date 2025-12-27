# Azure Blob Storage Integration Setup Guide

## Overview
Your application now supports Azure Blob Storage for storing user info files. Files are stored as `{userId}_gable_info.json` in your Azure container.

## Setup Instructions

### 1. Configure Azure Credentials

Edit the file [config/azure.yaml](config/azure.yaml) and fill in your Azure Storage details:

```yaml
# Storage account name
storageAccountName: "your-storage-account-name"

# Container name where user info files are stored
containerName: "your-container-name"

# SAS Token (without the leading '?')
sasToken: "your-sas-token-here"

# Enable/disable Azure Blob Storage
enabled: true
```

### 2. Choose Authentication Method

**Option A: SAS Token (Recommended for testing)**
```yaml
storageAccountName: "mystorageaccount"
containerName: "gable-users"
sasToken: "sv=2021-06-08&ss=b&srt=sco&sp=rwdlac&se=2026-12-31T23:59:59Z&st=2025-01-01T00:00:00Z&spr=https&sig=..."
enabled: true
```

**Option B: Connection String**
```yaml
storageAccountName: "mystorageaccount"
containerName: "gable-users"
connectionString: "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=yourkey;EndpointSuffix=core.windows.net"
enabled: true
```

### 3. File Naming Convention

When a user with ID `P21234b567c` logs in, the system will:
- Read from: `P21234b567c_gable_info.json`
- Write to: `P21234b567c_gable_info.json`

**Note:** The system automatically uses the `_gable_info.json` suffix (not `_visualsearch_info.json` or `_spatialnavigation_info.json`).

### 4. Local Fallback Mode

If Azure is disabled or not configured, the system will fall back to the local filesystem:
```yaml
enabled: false
```

This stores files in:
- `users/visualsearch/info/{userId}_visualsearch_info.json`
- `users/spatialnavigation/info/{userId}_spatialnavigation_info.json`

## How to Get Azure Credentials

### Create a Storage Account
1. Go to [Azure Portal](https://portal.azure.com)
2. Create a Storage Account or use an existing one
3. Note your **Storage Account Name**

### Create a Container
1. Navigate to your Storage Account
2. Go to "Containers" under "Data Storage"
3. Create a new container (e.g., `gable-users`)
4. Set the access level (usually "Private")
5. Note your **Container Name**

### Generate SAS Token
1. In your Storage Account, go to "Shared access signature"
2. Select permissions:
   - ✅ Read
   - ✅ Write
   - ✅ Delete
   - ✅ List
   - ✅ Add
   - ✅ Create
3. Set start and expiry dates
4. Click "Generate SAS and connection string"
5. Copy the **SAS token** (remove the leading `?` if present)

## Testing the Integration

### Test 1: Start the Server
```bash
npm start
```

You should see:
```
✅ Azure Blob Storage initialized successfully
Server running on http://localhost:3000
```

### Test 2: Check Existing User
The system will automatically read/write to Azure when users log in.

### Test 3: List All Users (Optional)
You can add this endpoint to [server.js](server.js):

```javascript
app.get('/api/list-users', async (req, res) => {
  try {
    const userIds = await azureBlobService.listUserInfoBlobs();
    res.json({ userIds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Troubleshooting

### Error: "Azure configuration incomplete"
- Make sure you've filled in either `connectionString` OR both `storageAccountName` + `sasToken`

### Error: "Blob does not exist"
- The user info file hasn't been created yet in Azure
- Check that the file naming is correct: `{userId}_gable_info.json`

### Error: "Authentication failed"
- Verify your SAS token is valid and not expired
- Check that your SAS token has the correct permissions (Read, Write, List, etc.)
- Ensure there's no leading `?` in the `sasToken` field

### Falls back to local filesystem
- Check that `enabled: true` in [config/azure.yaml](config/azure.yaml)
- Verify there are no errors in the console when starting the server

## Migration from Local to Azure

If you have existing local files you want to migrate to Azure:

1. Keep `enabled: false` initially
2. Run your application normally
3. Set `enabled: true`
4. Restart the server
5. Upload existing files manually to Azure Blob Storage with the naming pattern `{userId}_gable_info.json`

## Security Best Practices

1. **Never commit credentials to Git**
   - Add `config/azure.yaml` to `.gitignore`
   - Use environment variables for production

2. **Use SAS tokens with limited permissions**
   - Only grant necessary permissions (Read, Write, List)
   - Set reasonable expiry dates

3. **Rotate credentials regularly**
   - Regenerate SAS tokens periodically
   - Update the configuration file

4. **Use Azure Key Vault for production**
   - Store secrets in Azure Key Vault
   - Reference them in your application

## Additional Features

The `azureBlobService.js` module provides these functions:

- `readUserInfo(userId, experiment)` - Read user info file
- `writeUserInfo(userId, data, experiment)` - Write user info file
- `listUserInfoBlobs()` - List all user IDs
- `deleteUserInfo(userId)` - Delete user info file
- `isAzureEnabled()` - Check if Azure is enabled

You can use these in your routes as needed.
