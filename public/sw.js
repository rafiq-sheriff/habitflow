self.addEventListener("install", (event) => {
  // Ensure the service worker becomes active quickly.
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push events sent by the backend (web push).
self.addEventListener("push", (event) => {
  let payload = {};

  try {
    if (event.data) payload = event.data.json();
  } catch {
    // If payload isn't JSON, treat it as plain text.
    payload = { body: event.data?.text?.() };
  }

  const title = payload.title || "HabitFlow";
  const body = payload.body || "Time for your daily check-in.";
  const tag = payload.tag || "habitflow-reminder";
  const url = payload.url || "/";

  const options = {
    body,
    tag,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Open the app when the user clicks the notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});

