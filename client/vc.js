async function init()
{
    console.log("> Initializing client lib...");
    extFnVcInit = initVcTest;
    await initClientLib();
    console.log("> Done!");
}

init().then();
