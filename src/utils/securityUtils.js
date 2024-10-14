import { session } from 'electron';

export function setupSecurityPolicies() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
        responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [
              "default-src * data: blob: filesystem: about: ws: wss: 'unsafe-inline' 'unsafe-eval'; " +
              "script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
              "connect-src * data: blob: 'unsafe-inline'; " +
              "img-src * data: blob: 'unsafe-inline'; " +
              "frame-src * data: blob: ; " +
              "style-src * data: blob: 'unsafe-inline'; " +
              "font-src * data: blob: 'unsafe-inline';"
            ]
          }
        });
      });

  session.defaultSession.webRequest.onCompleted((details) => {
    if (details.statusCode === 404 && details.url.includes('api.x.com')) {
      console.log('Received 404 for API call:', details.url);
    }
  });
}