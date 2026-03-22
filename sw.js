const CACHE_NAME = "jeremy-fitness-v4";
const URLS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

// ── Cache Install ───────────────────────────────────────────────────
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(URLS);
    })
  );
  self.skipWaiting();
});

// ── Cache Cleanup ───────────────────────────────────────────────────
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch (cache-first) ─────────────────────────────────────────────
self.addEventListener("fetch", function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).catch(function() {
        return caches.match("./index.html");
      });
    })
  );
});

// ── Notification Click Handler ──────────────────────────────────────
self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  var action = e.action;

  if (action === "snooze") {
    // Snooze: send message to client or schedule new notification in 9 min
    e.waitUntil(
      self.clients.matchAll({type: "window"}).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({action: "snooze"});
        });
        // If no client is open, schedule a new notification
        if (clients.length === 0) {
          setTimeout(function() {
            self.registration.showNotification("⏰ Jeremy — 6h00 !", {
              body: "Snooze terminé ! C'est l'heure de ta séance !",
              icon: "./icon-192.png",
              badge: "./icon-192.png",
              tag: "morning-alarm",
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200]
            });
          }, 9 * 60 * 1000);
        }
      })
    );
    return;
  }

  // Default: open the app
  e.waitUntil(
    self.clients.matchAll({type: "window"}).then(function(clients) {
      for (var i = 0; i < clients.length; i++) {
        if (clients[i].url.includes("index.html") && "focus" in clients[i]) {
          clients[i].postMessage({action: "open"});
          return clients[i].focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./index.html");
      }
    })
  );
});

// ── Periodic Background Sync (Android Chrome) ──────────────────────
self.addEventListener("periodicsync", function(e) {
  if (e.tag === "morning-alarm") {
    e.waitUntil(checkAndNotify());
  }
});

function checkAndNotify() {
  var now = new Date();
  var hour = now.getHours();
  // Only fire between 5:55 and 6:10
  if (hour === 6 || (hour === 5 && now.getMinutes() >= 55)) {
    return self.registration.showNotification("⏰ Jeremy — 6h00 !", {
      body: "Debout ! Ta séance t'attend. Chaque jour compte 💪",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      tag: "morning-alarm",
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        {action: "open", title: "🚀 Séance"},
        {action: "snooze", title: "😴 Snooze 9min"}
      ]
    });
  }
  return Promise.resolve();
}

// ── Push Notifications (for future server-side push) ────────────────
self.addEventListener("push", function(e) {
  var data = e.data ? e.data.json() : {};
  var title = data.title || "Jeremy Fitness";
  var options = {
    body: data.body || "Tu as une notification !",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: data.tag || "jfit-push",
    requireInteraction: true,
    vibrate: [200, 100, 200]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});