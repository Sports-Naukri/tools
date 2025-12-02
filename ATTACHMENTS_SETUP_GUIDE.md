# Setting Up File Attachments (Vercel Blob)

This guide explains how to configure the Vercel Blob storage required to enable file uploads in the chat application.

## Prerequisites

- Access to the Vercel project dashboard.
- A Vercel account with permissions to add storage resources.

## Step 1: Create a Blob Store

1. Go to your project in the [Vercel Dashboard](https://vercel.com/dashboard).
2. Navigate to the **Storage** tab.
3. Click **Create Database** (or "Connect Store") and select **Blob**.
4. Give it a name (e.g., `sn-chat-attachments`) and click **Create**.

## Step 2: Get the Read/Write Token

Once the store is created:

1. In the Blob store settings page, look for the **Environment Variables** section or the **Settings** tab.
2. Find the token labeled `BLOB_READ_WRITE_TOKEN`.
3. Copy this value. It usually starts with `vercel_blob_rw_...`.

## Step 3: Configure Environment Variables

### For Local Development
1. Open the `.env.local` file in the root of the project.
2. Add or update the following line:
   ```env
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here
   ```
3. Ensure that attachments are **not** disabled:
   ```env
   NEXT_PUBLIC_ATTACHMENTS_DISABLED=false
   ```
   *(If this variable is set to `true`, the UI will hide the upload button).*

### For Production (Vercel Deployment)
1. Go to your project's **Settings** > **Environment Variables** in the Vercel Dashboard.
2. Add a new variable:
   - **Key**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: (Paste the token you copied in Step 2)
   - **Environments**: Check Production, Preview, and Development as needed.
3. Save the variable.
4. **Redeploy** the application for the changes to take effect.

## Step 4: Verification

1. Open the chat application.
2. Verify that the **paperclip icon** is visible in the chat input area.
3. Try uploading a small file (e.g., a PDF or image under 5MB).
4. If the upload succeeds and the file appears in the chat, the setup is complete.

## Troubleshooting

- **"File uploads are not configured"**: This error means the `BLOB_READ_WRITE_TOKEN` is missing or invalid on the server. Check your environment variables.
- **Upload button is disabled/greyed out**: Check if `NEXT_PUBLIC_ATTACHMENTS_DISABLED` is set to `true`.
- **CORS Errors**: Vercel Blob handles CORS automatically, but ensure your domain is allowed if you have custom security rules.
