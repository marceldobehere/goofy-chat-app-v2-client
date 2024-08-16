const sleep = async (time) => await new Promise(r => setTimeout(r, time));

async function init()
{
    try {
        await setStatus("Init Lib")
        console.log("> Initializing client lib...");
        await initClientLib();

        await setStatus("Init UI")
        await doConnInit();

        await setStatus("Init Acc")
        if (!hasOwnUserChatInfo(currentUser))
            await askOwnChatInfo();

        await setStatus("Ready")
        console.log("> Done!");
    }
    catch (e)
    {
        await setStatus("Fatal Error");
        alert("Fatal error: " + e);
        alert("If this issue persists, consider contacting @marceldobehere or resetting your profile.")
        logFatalErrorAndCrash(e);
    }
}

//init().then();

function domLoaded()
{
    init().then();
}
