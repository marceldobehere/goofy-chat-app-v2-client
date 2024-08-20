let serviceWorkerRegistration = undefined;
async function initServiceWorker()
{
    if (serviceWorkerRegistration != undefined)
        return false;

    if ('serviceWorker' in navigator) {

        // For development purposes, we can unregister all service workers
        if (true) {
            try {
                let registrations = await navigator.serviceWorker.getRegistrations();
                logInfo('> Unregistering Service Workers')
                for (let registration of registrations) {
                    logInfo(`> Unregistering Service Worker: ${registration.scope}`);
                    await registration.unregister();
                }
                logInfo("> Service Workers Unregistered")
            } catch (e) {
                logError('Service Worker Unregistration Failed');
                console.error(e);
            }
        }

        try {
            let registration = await navigator.serviceWorker.register('./js/serviceWorker.js');
            if (registration.installing) {
                logInfo("> Service worker installing");
            } else if (registration.waiting) {
                logInfo("> Service worker installed");
            } else if (registration.active) {
                logInfo("> Service worker active");
            }

            logInfo('> Service Worker Registered');
            serviceWorkerRegistration = registration;
            return serviceWorkerRegistration != undefined;
        } catch (e) {
            logError('Service Worker Registration Failed');
            console.error(e);
            return false;
        }
    }
}

function urlBase64ToUint8Array(base64String)
{
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i)
    {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function getSubscription()
{
    if (serviceWorkerRegistration == undefined)
        return null;

    let subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (subscription)
        return subscription;

    // TODO: Look into ways of having push notifications work with decentralized servers
    let firstSock = serverSocketList[0];
    let reply = await msgSendAndGetReply(firstSock, "get-server-pub-key", {});

    const vapidPublicKey = reply["public-key"];
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    console.log("Converted Vapid Key: ", convertedVapidKey);

    try {
        subscription = await serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });
    } catch (err) {
        console.error('Failed to subscribe the user: ', err);
        return null;
    }

    reply = await msgSendAndGetReply(firstSock, "push-subscribe", {
        userId: currentUser['mainAccount']["userId"],
        subscription: subscription
    });
    if (reply["error"] != undefined)
    {
        console.error('Failed to subscribe the user: ', reply["error"]);
        return null;
    }

    return await getSubscription();
}


let globalSubscription = null;
async function tryInitSubscription()
{
    let subscription = await getSubscription();
    if (subscription == null)
    {
        logError("No subscription found");
        return false;
    }

    logInfo("Subscription found");
    globalSubscription = subscription;
    return true;
}