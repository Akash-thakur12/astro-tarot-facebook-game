# Vercel Deployment Documentation: Prokerala API Secrets

To ensure the Prokerala API credentials are secure and not exposed to the client-side, they must be added as environment variables in the Vercel dashboard.

## Required Environment Variables

| Variable Name | Description |
| :--- | :--- |
| `PROKERALA_CLIENT_ID` | Your Prokerala API Client ID |
| `PROKERALA_CLIENT_SECRET` | Your Prokerala API Client Secret |

## How to Add Environment Variables in Vercel

1.  **Log in** to your [Vercel Dashboard](https://vercel.com/dashboard).
2.  Select your **AstroTarot** project.
3.  Go to the **Settings** tab at the top.
4.  Select **Environment Variables** from the left sidebar.
5.  **Add the Variables:**
    *   In the **Key** field, enter `PROKERALA_CLIENT_ID`.
    *   In the **Value** field, paste your Prokerala Client ID.
    *   Click **Add**.
    *   Repeat the process for `PROKERALA_CLIENT_SECRET`.
6.  **Redeploy:** After adding the variables, you must trigger a new deployment for the changes to take effect in the serverless functions.

## Local Development

To test locally with the Vercel CLI:
1. Create a `.env` file in the root directory.
2. Add the variables:
   ```env
   PROKERALA_CLIENT_ID=your_id
   PROKERALA_CLIENT_SECRET=your_secret
   ```
3. Run `vercel dev` to simulate the serverless environment.
