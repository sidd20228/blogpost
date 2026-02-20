/**
 * ─── GitHub OAuth Token Exchange Proxy ─────────────────────────
 * Cloudflare Worker that exchanges the OAuth code for an access token.
 *
 * SETUP:
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → Create
 * 2. Name it "blog-oauth-proxy"
 * 3. Paste this code and deploy
 * 4. Go to Worker Settings → Variables → Add:
 *    - CLIENT_ID     = Your GitHub OAuth App Client ID
 *    - CLIENT_SECRET = Your GitHub OAuth App Client Secret (encrypt this!)
 * 5. Copy the worker URL to your CONFIG.proxyUrl
 */

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders(request),
            });
        }

        // Only accept POST
        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405, request);
        }

        try {
            const { code } = await request.json();

            if (!code) {
                return jsonResponse({ error: 'Missing authorization code' }, 400, request);
            }

            // Exchange code for token with GitHub
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    client_id: env.CLIENT_ID,
                    client_secret: env.CLIENT_SECRET,
                    code: code,
                }),
            });

            const data = await tokenResponse.json();

            if (data.error) {
                return jsonResponse({
                    error: data.error,
                    error_description: data.error_description,
                }, 400, request);
            }

            return jsonResponse({
                access_token: data.access_token,
                token_type: data.token_type,
                scope: data.scope,
            }, 200, request);

        } catch (e) {
            return jsonResponse({ error: 'Internal server error' }, 500, request);
        }
    },
};

function corsHeaders(request) {
    const origin = request.headers.get('Origin') || '*';
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    };
}

function jsonResponse(data, status, request) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
        },
    });
}
