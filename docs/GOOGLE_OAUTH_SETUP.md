# Google OAuth Setup Guide for NEXORA

This guide explains how to enable and configure **Google OAuth** authentication in Supabase for NEXORA.

> [!IMPORTANT]
> **Zero-Secret Rule**: Never paste your Google Client Secret or credentials into chat or source code. Secrets belong exclusively in the Google Cloud Console and the Supabase Dashboard.

---

## Architecture Overview

```
Google Cloud OAuth Web App
        ↓ (Client ID & Client Secret)
Supabase Auth Google Provider
        ↓ (Redirect URL: window.location.origin)
NEXORA "Continue with Google"
        ↓ (Cryptographic JWT & User UUID)
NEXORA Student Profile & Protected Application
```

NEXORA anchors student profiles and all future learning data to the **Supabase User UUID** (`auth.users.id`). When a student uses Google OAuth, Supabase links or provisions the identity under this UUID, ensuring seamless access across devices and providers.

---

## Step-by-Step Setup Instructions

### Step 1: Obtain your Supabase Callback URL
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your NEXORA project.
3. In the left navigation, navigate to **Authentication** &rarr; **Providers**.
4. Scroll down to find and expand **Google**.
5. Copy the **Callback URL (for OAuth)** shown in the provider box.
   - Format: `https://<your-project-ref>.supabase.co/auth/v1/callback`

---

### Step 2: Configure OAuth Credentials in Google Cloud Console
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create a project (e.g., `Nexora-Learning`).
3. Set up the **OAuth Consent Screen**:
   - Navigate to **APIs & Services** &rarr; **OAuth consent screen**.
   - User Type: Select **External** (for all student Google accounts) and click **Create**.
   - App Information:
     - **App name**: `NEXORA`
     - **User support email**: Your student/developer email.
     - **Developer contact information**: Your email.
   - Scopes: Click **Save and Continue** (standard `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid` scopes are sufficient).
   - Test Users: If the app is in *Testing* status, add your test Google account emails.
4. Create **OAuth 2.0 Client ID**:
   - Navigate to **APIs & Services** &rarr; **Credentials**.
   - Click **+ CREATE CREDENTIALS** &rarr; **OAuth client ID**.
   - Application type: Select **Web application**.
   - Name: `NEXORA Web Client`.
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
     - *(Add your production domain when deployed)*
   - **Authorized redirect URIs**:
     - Paste the Supabase Callback URL copied in Step 1:
       `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Click **Create**.
5. Copy your **Client ID** and **Client Secret**.

---

### Step 3: Enable Google Provider in Supabase
1. Return to the [Supabase Dashboard](https://supabase.com/dashboard) &rarr; **Authentication** &rarr; **Providers** &rarr; **Google**.
2. Toggle the switch to **Enable Google provider**.
3. Paste the **Client ID** from Step 2 into the **Client ID** field.
4. Paste the **Client Secret** from Step 2 into the **Client Secret** field.
5. Click **Save**.

---

### Step 4: Configure Supabase Redirect URLs
1. In the Supabase Dashboard, navigate to **Authentication** &rarr; **URL Configuration**.
2. Under **Site URL**, set:
   - `http://localhost:5173` (for local development)
3. Under **Redirect URLs**, add:
   - `http://localhost:5173/**`
   - `http://127.0.0.1:5173/**`
   - *(Add your production URLs here when deploying)*
4. Click **Save**.

---

### Step 5: Verify in NEXORA
1. Start the NEXORA frontend:
   ```bash
   cd frontend
   npm run dev
   ```
2. Navigate to `http://localhost:5173/login` or `http://localhost:5173/signup`.
3. Click the **Continue with Google** button.
4. Complete the Google account authentication prompt.
5. Google will redirect back to Supabase, which verifies the session and securely redirects back to `http://localhost:5173/`.
6. Visit `http://localhost:5173/profile` to view your connected Google OAuth identity and Supabase Student UUID.

---

## Identity Linking (Same Email + Google Account)

- If a student signs up with `student@gmail.com` using email/password, and later clicks **Continue with Google** with that same Gmail address, Supabase links both identities to the **same Supabase User UUID** (when Supabase identity linking is enabled).
- In NEXORA, all notes, learning progress, and profile customizations belong strictly to the **UUID**, preventing data duplication or profile fragmentation.
