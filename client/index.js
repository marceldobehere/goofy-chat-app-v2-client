async function init()
{
    console.log("> Initializing client lib...");
    await initClientLib();
    await doConnInit();
    console.log("> Done!");
}

init().then();
