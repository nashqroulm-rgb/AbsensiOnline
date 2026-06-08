import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { public_id, resource_type } = await req.json();

    if (!public_id) {
      return new Response(JSON.stringify({ error: "public_id required", debug: { received: { public_id, resource_type } } }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cloudName = Deno.env.get("CLOUDINARY_CLOUD_NAME");
    const apiKey = Deno.env.get("CLOUDINARY_API_KEY");
    const apiSecret = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(JSON.stringify({
        error: "Cloudinary not configured",
        debug: {
          hasCloudName: !!cloudName,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
        },
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rt = resource_type || "image";
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${rt}/upload`;
    const auth = btoa(`${apiKey}:${apiSecret}`);

    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ public_ids: [public_id] }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({
        error: data.error?.message || "Delete failed",
        debug: { status: res.status, cloudinary: data },
      }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, deleted: data.deleted, debug: { status: res.status, cloudinary: data } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
