# Payout Desk (Supabase version)

Files: `index.html`, `style.css`, `app.js`, `config.js`, `supabase.sql`

## Setup (10 minute)

1. https://supabase.com par free project banao.
2. **Authentication > Providers > Email**: "Confirm email" ON rakho (admin email ki suraksha ke liye zaroori).
3. **SQL Editor** me `supabase.sql` paste karo. Pehle usme `you@example.com` ko apni admin email se badlo. Run karo.
4. **Project Settings > API** se `Project URL` aur `anon public` key copy karke `config.js` me paste karo. `ADMIN_EMAIL` bhi wahi email rakho.
5. Site khud ek baar sign up karke us admin email se banao, fir login karo. Admin tab sirf is email ko dikhega.
6. Hosting: poora folder Netlify, Vercel ya GitHub Pages par daal do. Local test ke liye `python3 -m http.server` chalao.

## Suraksha

- Asli rok `supabase.sql` ki RLS policies lagati hain: user sirf apni request dekh/bana sakta hai, status sirf admin email badal sakti hai.
- `ADMIN_EMAIL` ka check `app.js` me sirf tab chhupane ke liye hai. Agar koi use badal bhi de, database admin data nahi dega.
- `anon` key public hoti hai, usme dikkat nahi. `service_role` key kabhi front-end me mat daalo.

## Paisa transfer

Ye site paisa nahi bhejti. Approve ke baad aap FamPay app se manually pay karte ho aur "Mark paid" dabate ho. Automatic payout ke liye Razorpay X / Cashfree Payouts jaisa payout API chahiye (server-side function ke saath), FamPay ka public API nahi hai.
