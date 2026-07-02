// Helper to generate a random 6-character session ID
function generateSessionId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// CORS Headers helper
function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: cors,
      });
    }

    const { NILAM_PROGRESS } = env;
    if (!NILAM_PROGRESS) {
      return new Response(JSON.stringify({ error: "KV binding NILAM_PROGRESS is missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    try {
      // 1. GET /session
      if (url.pathname === "/session" && request.method === "GET") {
        const profile = url.searchParams.get("profile");
        if (!profile) {
          return new Response(JSON.stringify({ error: "Missing profile query parameter" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        const kvKey = `progress:${profile}`;
        let state = await NILAM_PROGRESS.get(kvKey, "json");

        if (!state) {
          state = {
            profile: profile,
            currentSession: generateSessionId(),
            currentBook: 0,
            dailyTarget: 50,
            langCounters: { bm: 0, en: 0, zh: 0 },
          };
          await NILAM_PROGRESS.put(kvKey, JSON.stringify(state));
        }

        return new Response(JSON.stringify(state), {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // 2. POST /advance
      if (url.pathname === "/advance" && request.method === "POST") {
        const { profile, lang, session } = await request.json();
        if (!profile || !lang || !session) {
          return new Response(JSON.stringify({ error: "Missing required parameters: profile, lang, session" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        const kvKey = `progress:${profile}`;
        let state = await NILAM_PROGRESS.get(kvKey, "json");

        if (!state || state.currentSession !== session) {
          return new Response(JSON.stringify({ error: "Invalid session or profile state not found" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        // Initialize counters safely if not exist
        if (!state.langCounters) {
          state.langCounters = { bm: 0, en: 0, zh: 0 };
        }

        state.currentBook = (state.currentBook || 0) + 1;
        
        // Match language identifier mapping (bm, en, zh)
        const targetLang = lang.toLowerCase();
        state.langCounters[targetLang] = (state.langCounters[targetLang] || 0) + 1;

        await NILAM_PROGRESS.put(kvKey, JSON.stringify(state));

        return new Response(JSON.stringify(state), {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // 3. POST /session/reset
      if (url.pathname === "/session/reset" && request.method === "POST") {
        const { profile } = await request.json();
        if (!profile) {
          return new Response(JSON.stringify({ error: "Missing profile" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        const kvKey = `progress:${profile}`;
        const state = {
          profile: profile,
          currentSession: generateSessionId(),
          currentBook: 0,
          dailyTarget: 50,
          langCounters: { bm: 0, en: 0, zh: 0 },
        };

        await NILAM_PROGRESS.put(kvKey, JSON.stringify(state));

        return new Response(JSON.stringify(state), {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // 4. POST /target (Update daily target)
      if (url.pathname === "/target" && request.method === "POST") {
        const { profile, target } = await request.json();
        if (!profile || typeof target !== "number") {
          return new Response(JSON.stringify({ error: "Missing profile or invalid target count" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        const kvKey = `progress:${profile}`;
        let state = await NILAM_PROGRESS.get(kvKey, "json");

        if (!state) {
          return new Response(JSON.stringify({ error: "Profile state not found" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...cors },
          });
        }

        state.dailyTarget = target;
        await NILAM_PROGRESS.put(kvKey, JSON.stringify(state));

        return new Response(JSON.stringify(state), {
          status: 200,
          headers: { "Content-Type": "application/json", ...cors },
        });
      }

      // Route not found
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...cors },
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }
  },
};
