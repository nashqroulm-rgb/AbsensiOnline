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

    // 1. Get first zone
    const { data: zones } = await adminClient.from("zones").select("id, nama, latitude, longitude").limit(1);
    if (!zones || zones.length === 0) {
      return new Response(JSON.stringify({ error: "No zones found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const zone = zones[0];
    const newLat = zone.latitude + 0.001;

    // 2. Try update
    const { data: updated, error: updateError } = await adminClient
      .from("zones")
      .update({ latitude: newLat })
      .eq("id", zone.id)
      .select();

    // 3. Read back
    const { data: readBack } = await adminClient
      .from("zones")
      .select("id, latitude")
      .eq("id", zone.id)
      .single();

    // 4. Restore original
    await adminClient
      .from("zones")
      .update({ latitude: zone.latitude })
      .eq("id", zone.id);

    return new Response(JSON.stringify({
      zone_id: zone.id,
      original_lat: zone.latitude,
      new_lat: newLat,
      update_result: { data: updated, error: updateError?.message },
      read_back: readBack,
    }, null, 2), {
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
