import { execSync } from 'child_process';
const envs = {
  DATABASE_URL: "postgresql://postgres.iiozcipbxsmjasgglsyf:0GUUxdo6XOgiQFIR@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://postgres.iiozcipbxsmjasgglsyf:0GUUxdo6XOgiQFIR@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres",
  NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_SxsfI6tvcKzNh7",
  RAZORPAY_KEY_SECRET: "05lLAKpRASK6FeTSDR1ztIK4",
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/focusdesk",
  NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY: "public_S+7Rxy8bxpnUY1iqcyTtIJNIJj0=",
  IMAGEKIT_PRIVATE_KEY: "private_PIkkTsCHgkhA3lLKUqOMLlB38L0=",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_cHJvbW90ZWQtZGlub3NhdXItNjMuY2xlcmsuYWNjb3VudHMuZGV2JA",
  CLERK_SECRET_KEY: "sk_test_erEHcHwf3C5o4H3irkRu3IgV62If22BUiABm4yeiPN"
};

for (const [key, value] of Object.entries(envs)) {
  try {
    console.log(`Removing old ${key}...`);
    execSync(`npx vercel env rm ${key} production --yes`, {stdio: 'ignore'});
  } catch(e) {}
  
  console.log(`Adding ${key}...`);
  // using process.env to pass value safely without shell escaping issues
  execSync(`node -e "process.stdout.write(process.env.VAL)" | npx vercel env add ${key} production`, { 
    env: { ...process.env, VAL: value },
    stdio: 'inherit' 
  });
}
