/**
 * Bob V2Ray Relay - Free Service Worker Version
 * No Edge Functions - 100% Free on Vercel
 * Service Worker-based HTTP relay for V2Ray/VLESS
 */

const TARGET_BASE = "http://vercel.parsashonam.sbs:2096";
const RELAY_PATH = "/p4r34m";
const VERSION = "3.0.0-free";

// Install event
self.addEventListener("install", (event) => {
  console.log(`[Bob SW v${VERSION}] Installing...`);
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log(`[Bob SW v${VERSION}] Activated`);
  event.waitUntil(self.clients.claim());
});

// Fetch event - main relay logic
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Only intercept requests to relay path
  if (!url.pathname.startsWith(RELAY_PATH)) {
    return; // Let browser handle normally
  }

  event.respondWith(handleRelayRequest(event.request, url));
});

async function handleRelayRequest(request, url) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const startTime = Date.now();

  try {
    // Build target URL
    const targetPath = url.pathname + url.search;
    const targetUrl = `${TARGET_BASE}${targetPath}`;

    console.log(`[Bob SW] Relay request:`, {
      id: requestId,
      method: request.method,
      path: url.pathname,
      target: targetUrl
    });

    // Build headers for upstream request
    const headers = new Headers();
    
    // Copy relevant headers
    const allowedHeaders = [
      'accept',
      'accept-encoding',
      'accept-language',
      'cache-control',
      'content-type',
      'pragma',
      'range',
      'referer',
      'user-agent',
      'upgrade',
      'sec-websocket-key',
      'sec-websocket-version',
      'sec-websocket-extensions',
      'sec-websocket-protocol'
    ];

    for (const [key, value] of request.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('sec-')) {
        headers.set(key, value);
      }
    }

    // Add forwarding headers
    headers.set('X-Forwarded-For', url.hostname);
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));
    headers.set('X-Bob-Version', VERSION);

    // Prepare fetch options
    const fetchOptions = {
      method: request.method,
      headers: headers,
      redirect: 'manual',
      mode: 'cors'
    };

    // Add body for non-GET/HEAD requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        fetchOptions.body = await request.blob();
      } catch (err) {
        console.error(`[Bob SW] Error reading request body:`, err);
      }
    }

    // Make upstream request
    const response = await fetch(targetUrl, fetchOptions);

    // Build response headers
    const responseHeaders = new Headers();
    
    // Copy response headers (excluding hop-by-hop headers)
    const skipHeaders = ['connection', 'keep-alive', 'transfer-encoding', 'upgrade'];
    for (const [key, value] of response.headers.entries()) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    }

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('X-Bob-Relay', 'true');
    responseHeaders.set('X-Bob-Version', VERSION);

    const duration = Date.now() - startTime;
    console.log(`[Bob SW] Relay success:`, {
      id: requestId,
      status: response.status,
      duration: `${duration}ms`
    });

    // Return proxied response
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Bob SW] Relay error:`, {
      id: requestId,
      error: error.message,
      duration: `${duration}ms`
    });

    // Return error response
    return new Response(JSON.stringify({
      error: 'Relay Error',
      message: error.message,
      requestId: requestId,
      version: VERSION
    }), {
      status: 502,
      statusText: 'Bad Gateway',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Bob-Relay': 'error',
        'X-Bob-Version': VERSION
      }
    });
  }
}

// Handle OPTIONS requests
self.addEventListener("fetch", (event) => {
  if (event.request.method === "OPTIONS") {
    event.respondWith(
      new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400'
        }
      })
    );
  }
});

console.log(`[Bob SW v${VERSION}] Service Worker loaded and ready`);

// Made with Bob
