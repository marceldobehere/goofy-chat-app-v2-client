addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    console.log("[SW.JS] ACTIVATED")
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', async function (event) {
    console.log('[SW.JS] Notification click Received.', event.notification.data);
    event.notification.close();

    let resolve;
    let promise  = new Promise((res, rej) => resolve = res);
    event.waitUntil(promise);

    let clients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});

    let found = false;
    for (const client of clients) {
        if ("focus" in client) {
            console.log("[SW.JS] Focusing client");
            client.postMessage({type: "notification-click", data: event.notification.data});
            await client.focus();
            found = true;
        }
    }

    if (!found) {
        console.log("[SW.JS] Opening new window");
        await self.clients.openWindow("/client/");
        let client = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
        client.postMessage({type: "notification-click", data: event.notification.data});
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

self.addEventListener('push', function(event) {
    console.log("[SW.JS] PUSH EVENT: ", event);
    return event.waitUntil(
        // Retrieve a list of the clients of this service worker.
        self.clients.matchAll().then(function(clientList) {
            // Check if there's at least one focused client.
            let focused = clientList.some(function(client) {
                return client.focused;
            });

            if (focused) {
                return;
            }

            console.log("> PUSH EVENT: ", event);
            let title = "New messages available";
            let body = "You have new messages";
            return self.registration.showNotification(title, {
                body: body,
                silent: true,
                data: 12345,
                icon: "./assets/imgs/icon.png",
                badge: "./assets/imgs/badge.png"
            });
        })
    );
});

console.log("[SW.JS] Service Worker Loaded");