let notifications = [];
let notificationsWork = false;
async function checkNotifications()
{
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
        return;
    }

    if (Notification.permission !== "denied")
    {
        if (await Notification.requestPermission())
            notificationsWork = true;
    }
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

    //console.log(notifications)
    for (let not of notifications) {
        //console.log(`> Closing notification: ${not.body}`);
        not.close();
    }

    notifications = [];
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

function showNotification(title, msg, callback)
{
    if (!canNotify())
        return;

    //console.log(`> Showing notification: ${msg}`);

    const notification = new Notification(title, {body: msg, silent: true});
    notifications.push(notification);

    notification.onclick = (ev) =>
    {
        clearNotifications();

        if (typeof callback == "function")
            callback(ev);
        window.focus();
    };
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