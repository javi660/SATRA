const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

// Un solo cliente — usa service_role si está disponible, anon si no
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Cliente público para suscripciones realtime
const supabasePublic = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY || supabaseKey
);

module.exports = { supabase, supabasePublic };
