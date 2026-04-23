# Deploying Yo Social! to Render.com

It is incredibly easy to deploy Yo Social! to Render.com.

## One-Click Deploy (Blueprint)

Since this repository contains a `render.yaml`, you can simply connect your GitHub repository to Render by going to:
[Render Dashboard -> New -> Blueprint](https://dashboard.render.com/blueprints).

1. Select your repository.
2. Render will automatically detect the static site configuration.
3. You will be prompted to enter the environment variables (see below).
4. Click "Apply" and your application will build and deploy automatically!

## Environment Variables required in Render:

You need to provide the same environment variables that your local `.env` uses:

- **`VITE_SUPABASE_URL`**: Your Supabase project URL (e.g. `https://xxxxxx.supabase.co`)
- **`VITE_SUPABASE_ANON_KEY`**: Your Supabase project Anon / public key

## Manual Deployment

If you prefer to deploy manually as a Static Site instead of using Blueprints:

1. Create a New **Static Site** on Render.
2. Connect your GitHub repository.
3. Set the **Build Command** to: `npm install && npm run build`
4. Set the **Publish directory** to: `dist`
5. Go to the "Advanced" section and add the Environment Variables mentioned above.
6. Click **Create Static Site**.

## Fast Load Optimization

The application uses Vite, which automatically minifies and optimizes your javascript and css. On Render, serving via a Static Site automatically leverages Render's global CDN, ensuring that your users get incredibly fast load times worldwide!
