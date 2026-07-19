/* Service worker for conditions-alert push notifications (Stage B).
   Receives a push payload { title, body, url } and shows a notification;
   clicking it focuses an open tab for that spot or opens one. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Good paddling conditions";
  const options = {
    body: data.body || "One of your saved spots looks good to paddle.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Navigate an existing tab to the deep link (not just focus it) so the
      // alert token/context in targetUrl reaches the page and the open-ping
      // fires; otherwise a focused-but-not-navigated tab would drop the return.
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            return client.navigate(targetUrl).then((c) => (c || client).focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
