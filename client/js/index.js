async function init()
{
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

//init().then();

function domLoaded()
{
    init().then();
}
