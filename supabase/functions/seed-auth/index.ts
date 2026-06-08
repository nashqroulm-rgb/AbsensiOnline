import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const users = [
      { id: "c0000000-0000-4000-8000-000000000011", no_hp: "080000000001", nama: "Admin Sistem", password: "1234", role: "admin" },
      { id: "c0000000-0000-4000-8000-000000000001", no_hp: "081234567890", nama: "Budi Santoso", password: "1234", role: "worker" },
    ];

    const results = [];

    for (const u of users) {
      const email = `${u.no_hp}@absensi.local`;

      // Delete existing
      const { data: existing } = await adminClient.auth.admin.listUsers();
      const found = existing?.users?.find((au: { email?: string }) => au.email === email);
      if (found) {
        await adminClient.auth.admin.deleteUser(found.id);
      }

      // Create with matching ID
      const { data, error } = await adminClient.auth.admin.createUser({
        id: u.id,
        email,
        password: u.password,
        email_confirm: true,
        user_metadata: { nama: u.nama, no_hp: u.no_hp, role: u.role },
      });

      results.push({
        no_hp: u.no_hp,
        email,
        auth_user_id: data?.user?.id || null,
        error: error?.message || null,
      });
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
