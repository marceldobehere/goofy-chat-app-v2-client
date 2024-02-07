async function init()
{
    console.log("> Initializing client lib...");
    await initClientLib();
    console.log("> Done!");
}

init().then();