let serverList;
let currentUser;

function initUserStuff()
{
    currentUser = loadObject("currentUser");
    if (currentUser == null)
    {
        currentUser = createUser();
        saveObject("currentUser", currentUser);
    }
    logTxt(`Current User: (Main: ${currentUser["mainAccount"]["userId"]}, Listener: ${currentUser["listenerAccount"]["userId"]} (Enabled: ${currentUser["useListener"]}))`);

    if (testUser(currentUser))
        logInfo("Encryption with user works.");
    else
        logFatalErrorAndCrash("Encryption with user is broken!");
}

function initServerListStuff()
{
    serverList = loadObjectOrCreateDefault("serverList", ["https://goofy2.marceldobehere.com"]);
    //serverList = ["https://goofy2.marceldobehere.com"];
    saveObject("serverList", serverList);
    logTxt("Server List:", serverList);
}

async function checkUserStuff()
{
    let pubKey = await getPublicKeyFromUser(currentUser["mainAccount"]["userId"]);
    if (pubKey === undefined)
    {
        logError("User not found on server");
        return;
    }
    //logInfo(`User public key: ${pubKey}`);

    if (pubKey != currentUser["mainAccount"]["public-key"])
        logFatalErrorAndCrash("User public key does not match local public key!");
    else
        logInfo("User public key matches local public key!");
}

async function initClientLib()
{
    await initLocalStorageStuff(
        () => {
            return prompt("Enter password:");
        },
        () => {
            alert("Invalid password");
        },
        () => {
            return confirm("Do you want to secure your data with a password?");
        });

    initUserStuff();
    initServerListStuff();

    await createSockets(serverList, currentUser);
    await checkUserStuff();

    await initMsgSystem();


    //console.log(await accSendRawMessage(currentUser["mainAccount"], currentUser["mainAccount"]["userId"], {text: "yooo"}));
}
