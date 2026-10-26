// BUD & THINGS · where the shop keeps everything that changes without a code change: products, prices, stock,
// photos and videos, site text, settings, orders, reviews and sign-ups. See bud-and-things/supabase/README.md.
//
// Paste the two values from Supabase → Project Settings → API. The anon key is meant to be public: what it can
// read and write is limited by the rules in supabase/schema.sql. Leave them empty to run the site on its built-in
// draft content, with owner changes kept in this browser only.
window.BT_CONFIG = {
  // Owner sign-in asks for an authenticator app code after the password when this is true. Off until launch; turn it
  // on together with owner_two_step() in supabase/schema.sql.
  ownerTwoStep: false,
  // Photos and videos are stored on Cloudinary and delivered resized (f_auto,q_auto). The upload preset must be Unsigned;
  // never put the Cloudinary API secret here. Leave `cloud` empty to keep using Supabase storage.
  cloudinary: { cloud: 'ayyjmq3n', preset: 'budandthings' },
  supabase: {
    url: 'https://cgccziskvqyatrjqdtka.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnY2N6aXNrdnF5YXRyanFkdGthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjUxOTcsImV4cCI6MjEwNzY0MTE5N30.ghhwMTaqfhfqQkImPNSJFF5Nmiw6Od8WMrYGt5rvrEE'
  }
};
