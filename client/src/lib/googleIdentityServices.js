const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let googleIdentityServicesPromise = null;

export const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.compose',
].join(' ');

export function loadGoogleIdentityServices() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Identity Services is only available in the browser.'));
  }

  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }

  if (googleIdentityServicesPromise) {
    return googleIdentityServicesPromise;
  }

  googleIdentityServicesPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);

    const handleLoad = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google);
      } else {
        googleIdentityServicesPromise = null;
        reject(new Error('Google Identity Services loaded without OAuth support.'));
      }
    };

    const handleError = () => {
      googleIdentityServicesPromise = null;
      reject(new Error('Failed to load Google Identity Services.'));
    };

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return googleIdentityServicesPromise;
}
