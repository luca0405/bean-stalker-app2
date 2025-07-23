# GitHub Secrets Configuration for RevenueCat IAP

## Current Issue
The diagnostic screenshot confirms: **"VITE_REVENUECAT_API_KEY not set"**

This means the GitHub secret is not properly configured or the workflow isn't accessing it correctly.

## Required GitHub Secret Setup

### Step-by-Step Instructions:

1. **Go to GitHub Repository**
   - Navigate to: `https://github.com/luca0405/bean-stalker-app2`
   - Click: **Settings** tab

2. **Access Secrets Configuration**
   - In the left sidebar, click: **Secrets and variables**
   - Click: **Actions**

3. **Add/Update the RevenueCat Secret**
   - Look for existing secret named: `VITE_REVENUECAT_API_KEY`
   - If it exists, click **Update**
   - If it doesn't exist, click **New repository secret**

4. **Set the Secret Value**
   - **Name**: `VITE_REVENUECAT_API_KEY`
   - **Secret**: `appl_owLmakOcTeYJOJoxJgScSQZtUQA`
   - Click **Add secret** or **Update secret**

### Verification Checklist:
- [ ] Secret name is exactly: `VITE_REVENUECAT_API_KEY` (case-sensitive)
- [ ] Secret value is exactly: `appl_owLmakOcTeYJOJoxJgScSQZtUQA` (no extra spaces)
- [ ] Secret is saved in the repository: `luca0405/bean-stalker-app2`

## Next Steps After Configuration

1. **Trigger New iOS Build**
   - Go to: Actions tab in GitHub
   - Find: "iOS Build - Simple Fix" workflow
   - Click: "Run workflow"
   - Select: `main` branch
   - Click: "Run workflow" button

2. **Monitor Build Logs**
   Look for this line in the build output:
   ```
   Building with RevenueCat API Key: CONFIGURED
   RevenueCat API Key for Capacitor sync: CONFIGURED
   ```

3. **Test Updated App**
   - Wait for build completion (~20-30 minutes)
   - Install updated TestFlight build
   - Open Bean Stalker → Buy Credits → Diagnostic tab
   - Run diagnostics - should now show:
   ```
   ✅ RevenueCat API Key: Configured
   ✅ IAP Service Initialization: Success
   ```

## If Issue Persists

### Alternative Workflow Fix
If the GitHub secret still doesn't work, try this manual verification:

1. **Check Current Secrets List**
   - In GitHub repository → Settings → Secrets and variables → Actions
   - Verify `VITE_REVENUECAT_API_KEY` appears in the list
   - Note: You can't view the secret value, only confirm it exists

2. **Test Secret Access**
   - Trigger the workflow and check build logs
   - Look for the environment variable verification step
   - If it shows "MISSING", the secret isn't properly configured

### Emergency Manual Build Option
If GitHub Actions continues to have issues, we can:
1. Export the project files
2. Build locally with Xcode
3. Upload directly to TestFlight

But the GitHub secret configuration should resolve the issue completely.