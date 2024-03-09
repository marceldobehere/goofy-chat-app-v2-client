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

    await initUserMsgSystem();
    await initMsgSystem();

    await createSockets(serverList, currentUser);
    await checkUserStuff();

    tryExtFn(extFnVcInit);

    //console.log(await accSendRawMessage(currentUser["mainAccount"], currentUser["mainAccount"]["userId"], {text: "yooo"}));
}

function currUserExportMainAccount()
{
    return exportMainAccount(currentUser);
}

function currUserImportUserMainAccountAndCreateCustomListener(importedUser)
{
    importUserMainAccountAndCreateCustomListener(currentUser, importedUser);
    saveObject("currentUser", currentUser);
}

function currUserAddRedirect(listener)
{
    addRedirectToUser(currentUser, listener);
    saveObject("currentUser", currentUser);
}

function currUserClearRedirects()
{
    clearRedirects(currentUser);
    saveObject("currentUser", currentUser);
}

function currUserImportUserMainAccountAndRedirectAndCreateCustomListener(importedUser)
{
    importUserMainAccountAndCreateCustomListener(currentUser, importedUser);
    addRedirects(currentUser, importedUser["redirectAccounts"]);
    currUserAddRedirect(importedUser["listenerAccount"]["userId"]);
    saveObject("currentUser", currentUser);
}

async function currUserFullImport(importedUser, As2ndAccount)
{
    if (!As2ndAccount)
    {
        // This essentially is like restoring a backup
        currentUser = importedUser;
        saveObject("currentUser", currentUser);
        return;
    }

    // This is like creating an additional account for this user
    importUserMainAccountAndCreateCustomListener(currentUser, importedUser);
    addRedirects(currentUser, importedUser["redirectAccounts"]);
    currUserAddRedirect(importedUser["listenerAccount"]["userId"]);
    saveObject("currentUser", currentUser);

    await sendSecureMessageToUser(importedUser["mainAccount"], importedUser["mainAccount"]["userId"],
        {userId:currentUser["listenerAccount"]["userId"]}, "add-redirect");
}