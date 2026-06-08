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

    const results: Record<string, unknown> = {};

    // 1. Auth users
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    results.auth_users = authUsers?.users
      ?.filter((u: { email?: string }) => u.email?.includes("@absensi.local"))
      .map((u: { id: string; email: string; user_metadata: Record<string, unknown> }) => ({
        id: u.id,
        email: u.email,
        no_hp: u.user_metadata?.no_hp,
        nama: u.user_metadata?.nama,
      })) || [];

    // 2. Public users
    const { data: pubUsers } = await adminClient
      .from("users")
      .select("id, nama, no_hp, role, status")
      .in("no_hp", ["080000000001", "081234567890"]);
    results.public_users = pubUsers || [];

    // 3. Check mismatch
    const authMap = new Map(results.auth_users.map((u: { no_hp: string; id: string }) => [u.no_hp, u.id]));
    const pubMap = new Map(results.public_users.map((u: { no_hp: string; id: string }) => [u.no_hp, u.id]));

    results.mismatch = [];
    for (const noHp of ["080000000001", "081234567890"]) {
      const authId = authMap.get(noHp);
      const pubId = pubMap.get(noHp);
      results.mismatch.push({
        no_hp: noHp,
        auth_id: authId || "NOT FOUND",
        public_id: pubId || "NOT FOUND",
        status: authId && pubId && authId === pubId ? "MATCH" : "MISMATCH",
      });
    }

    // 4. Orphan attendances
    const { data: orphanAtt } = await adminClient
      .from("attendances")
      .select("id, user_id, user_nama, status, checkin_at")
      .not("user_id", "in", `(${results.public_users.map((u: { id: string }) => `"${u.id}"`).join(",")})`);
    results.orphan_attendances = orphanAtt || [];

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
