# Secret Injection Setup Guide

## Why Your Secrets Aren't Working

Your HTML files contain placeholders like `__SUPABASE_URL__` instead of real values. The GitHub Actions workflow automatically replaces these with your actual secrets when you push code.

## Step 1: Add Your Secrets to GitHub

1. Go to your repository: https://github.com/in160011425-afk/Dan-s-Appartments
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **Secret 1:**
   - Name: `SUPABASE_URL`
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Click **Add secret**

   **Secret 2:**
   - Name: `SUPABASE_ANON_KEY`
   - Value: Your Supabase anonymous key (long JWT token)
   - Click **Add secret**

## Step 2: Verify Your HTML Has Placeholders

Your `index.html` and `tenant.html` should contain this script:

```html
<script>
  window.SUPABASE_URL = "__SUPABASE_URL__";
  window.SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";
</script>
```

If you don't have this, add it before your other scripts load.

## Step 3: Trigger the Workflow

The workflow runs automatically when you:
- Push to `main` branch, OR
- Manually trigger it from the Actions tab

After the workflow completes:
- ✅ Your secrets are injected into HTML files
- ✅ Changes are automatically committed and pushed back
- ✅ Your website loads with real Supabase credentials

## Step 4: Verify It Worked

1. After the workflow runs, open your deployed site
2. Open **browser DevTools** (F12)
3. In the Console, type: `window.SUPABASE_URL`
4. If it shows your actual Supabase URL (not `"__SUPABASE_URL__"`), you're ✅ good!

## Troubleshooting

**Q: Workflow failed?**
- Check the workflow run logs (Actions tab → workflow → click run)
- Ensure secrets are named exactly `SUPABASE_URL` and `SUPABASE_ANON_KEY` (case-sensitive)

**Q: Still getting "null" errors?**
- Make sure your secrets are saved (they won't display the value, just ●●●●●)
- Force redeploy or push a new commit to trigger the workflow again

**Q: Can I test locally?**
Yes! Create a file called `config.js` in your root:
```javascript
window.SUPABASE_URL = "YOUR_ACTUAL_URL";
window.SUPABASE_ANON_KEY = "YOUR_ACTUAL_KEY";
```
Then load it before `rooms.js` in your HTML.

