async function init()
{
    try {
        setStatus("Init Lib")
        console.log("> Initializing client lib...");
        await initClientLib();

        setStatus("Init UI")
        await doConnInit();

        setStatus("Init Acc")
        if (!hasOwnUserChatInfo(currentUser))
            await askOwnChatInfo();

        setStatus("Ready")
        console.log("> Done!");
    }
    catch (e)
    {
        setStatus("Fatal Error");
        logFatalErrorAndCrash(e);
    }
}

//init().then();

function domLoaded()
{
    init().then();
}
