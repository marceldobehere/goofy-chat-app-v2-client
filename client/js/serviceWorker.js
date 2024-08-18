addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    console.log("[SW.JS] ACTIVATED")
    event.waitUntil(self.clients.claim());
});

console.log("[SW.JS] Service Worker Loaded");

self.addEventListener('notificationclick', async function (event) {
    console.log('[SW.JS] Notification click Received.', event.notification.data);
    event.notification.close();

    let resolve;
    let promise  = new Promise((res, rej) => resolve = res);
    event.waitUntil(promise);

    let clients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});

    for (const client of clients) {
        if ("focus" in client) {
            console.log("[SW.JS] Focusing client");
            client.postMessage({type: "notification-click", data: event.notification.data});
            await client.focus();
        }
    }

    resolve();
});

self.addEventListener('notificationclose', function (event) {
    console.log('[SW.JS] Notification close Received.', event.notification.data);
});

self.addEventListener('message', async function (event) {
    console.log('[SW.JS] Message Received.', event.data);
    let evData = event.data;
    let type = evData.type;
    let data = evData.data;

    if (type == "clear-notifications") {
        console.log("[SW.JS] Clearing notifications");
        let notifications = await self.registration.getNotifications();
        for (let not of notifications) {
            not.close();
        }
    }
});