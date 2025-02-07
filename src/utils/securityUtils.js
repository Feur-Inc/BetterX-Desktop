import { session } from 'electron';

export function setupSecurityPolicies() {
  session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, callback) => {
    // Only modify CSP for Twitter/X domains
    if (url.includes('twitter.com') || url.includes('x.com')) {
      const modifiedHeaders = {
        ...responseHeaders,
        'content-security-policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; " +
          "img-src 'self' 'unsafe-inline' https: data: blob: *; " +
          "media-src 'self' https: data: blob: *; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
          "style-src 'self' 'unsafe-inline' https:; " +
          "connect-src 'self' https: wss: http: *;" // Modified this line to be more permissive
        ]
      };
      callback({ responseHeaders: modifiedHeaders });
    } else {
      callback({ responseHeaders });
    }
  });

  // Optional: Log blocked requests for debugging
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({cancel: false});
  });
}