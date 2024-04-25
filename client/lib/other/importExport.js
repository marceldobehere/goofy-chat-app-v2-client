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