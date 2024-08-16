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
            setStatus("Request Password");
            return prompt("Enter password:");
        },
        () => {
            alert("Invalid password");
        },
        () => {
            setStatus("Password?");
            return confirm("Do you want to secure your data with a password?");
        });

    docChatList.innerText = "Initialising User...";
    await sleep(10);
    await setStatus("Init User");
    initUserStuff();
    await setStatus("Init Chat");
    initChatStuff();
    await setStatus("Init Servers");
    initServerListStuff();
    await setStatus("Init Crypto");
    initUserPuKeyInterface();

    await setStatus("Init Msgs");
    await initLocalMsgInterface(currentUser["mainAccount"]);
    await initUserMsgSystem();
    await initMsgSystem();


    docChatList.innerText = "Connecting to server, this might take a moment with new accounts...";
    await setStatus("Init Sockets");
    await createSockets(serverList, currentUser);

    await setStatus("Check User");
    await checkUserStuff();
    docChatList.innerText = "";

    await setStatus("Init VC?");
    tryExtFn(extFnVcInit);
    await setStatus("Init Done")

    //console.log(await accSendRawMessage(currentUser["mainAccount"], currentUser["mainAccount"]["userId"], {text: "yooo"}));
}