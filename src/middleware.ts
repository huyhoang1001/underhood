import { defineMiddleware } from 'astro:middleware';

// On Vercel, req.url can come through as https://localhost/...
// which breaks Keystatic's OAuth redirect_uri construction.
// This middleware rewrites the request URL using the x-forwarded-host header.
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const forwardedHost = context.request.headers.get('x-forwarded-host');
  const forwardedProto = context.request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    const correctedUrl = new URL(context.request.url);
    correctedUrl.hostname = forwardedHost.split(':')[0];
    correctedUrl.port = '';
    correctedUrl.protocol = `${forwardedProto}:`;

    const newRequest = new Request(correctedUrl.toString(), {
      method: context.request.method,
      headers: context.request.headers,
    });

    return next(newRequest);
  }

  return next();
});
