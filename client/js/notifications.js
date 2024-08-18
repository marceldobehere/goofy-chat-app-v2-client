let notificationsWork = false;
async function checkNotifications()
{
    logInfo("Checking notifications")
    notificationsWork = false;
    //console.log(window.location.protocol);
    if (window.location.protocol != "https:" && window.location.protocol != "http:"
        && window.location.protocol != "localhost:")
        return;

    if (!settingsObj["notification"]["allow-notifications"])
        return;

    if (!("Notification" in window))
        return;

    if (Notification.permission === "granted")
    {
        notificationsWork = true;
        await initNotifications();
        return;
    }

    if (Notification.permission !== "denied")
    {
        if (await Notification.requestPermission())
            notificationsWork = true;
        await initNotifications();
    }
}

async function initNotifications()
{
    if (!(await initServiceWorker()))
        return;

    logInfo('Init the Notification Handlers');

    navigator.serviceWorker.addEventListener("message", (event) => {
        console.log('[Notifications.js] Service Worker Message: ', event);
        let evData = event.data;
        let type = evData.type;
        let data = evData.data;

        if (type == "notification-click")
        {
            let id = data;
            logInfo(`Notification click Received. ${id}`);

            let not = notificationMap.get(id);
            if (not != undefined)
            {
                logInfo(`Notification click Received. ${id} - Found`);
                if (typeof not.callback == "function")
                    not.callback(event);
                notificationMap.delete(id);
            }
        }
    });
}

const windowHasFocus = function () {
    if (document.hasFocus()) return true
    let hasFocus = false

    window.addEventListener('focus', function () {
        hasFocus = true
    })
    window.focus()

    return hasFocus
}

function clearNotifications()
{
    if (!notificationsWork)
        return;
    logInfo("Clearing notifications")

    serviceWorkerRegistration.active.postMessage({type: "clear-notifications"});
}

function windowVisible()
{
    return (windowHasFocus() || document.visibilityState == "visible")
}
function canNotify()
{
    if (!settingsObj["notification"]["allow-notifications"])
        return false;
    if (!notificationsWork)
        return false;
    if (windowVisible())
        return false;

    return true;
}

let notificationMap = new Map();


function showNotification(title, msg, callback)
{
    logInfo(`> Trying to show Notification: ${title} - ${msg}`)
    if (!canNotify())
        return logWarn("Cannot show notification!",
            settingsObj["notification"]["allow-notifications"],
            notificationsWork,
            windowVisible());

    logInfo(`> Showing notification: ${title} - ${msg}`);

    let randomId = getRandomIntInclusive(1000000, 9999999);
    notificationMap.set(randomId, {
        callback: callback
    });

    // TODO: AAAAAAAAAA
    //const notification = new Notification(title, {body: msg, silent: true});
    serviceWorkerRegistration.showNotification(title, {
        body: msg,
        silent: true,
        data: randomId

    }).then();
}

window.addEventListener('focus', () =>
{
    clearNotifications();
});

window.addEventListener('visibilitychange', () =>
{
    if (document.visibilityState == "visible")
        clearNotifications();
});


let msgSound = new Audio("./assets/audio/not.wav");
function playNotificationSound()
{
    if (!settingsObj["notification"]["allow-sound"])
        return;

    msgSound.play().then();
}

checkNotifications().then();