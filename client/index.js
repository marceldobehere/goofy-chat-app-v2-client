async function init()
{
    console.log("> Initializing client lib...");
    await initClientLib();
    await doConnInit();
    if (!hasOwnUserChatInfo(currentUser))
        await askOwnChatInfo();
    console.log("> Done!");
}

init().then();
