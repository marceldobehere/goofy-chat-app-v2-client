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