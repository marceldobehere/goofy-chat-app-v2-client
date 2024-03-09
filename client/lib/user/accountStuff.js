function createUser()
{
    return {
        "mainAccount": createAccount(),
        "listenerAccount": createAccount(),
        "useListener": true,
        "redirectAccounts": []
    }
}

function createAccount()
{
    let keys = generateKeys();
    return {
        "public-key": keys["public"],
        "private-key": keys["private"],
        "userId": hashString(keys["public"])
    };
}

function testAccount(account)
{
    let work = true;
    work &= testRsa(account["public-key"], account["private-key"]);
    work &= testAes(account["public-key"], account["private-key"]);

    return work;
}

function testUser(user)
{
    let work = true;
    work &= testAccount(user["mainAccount"]);
    work &= testAccount(user["listenerAccount"]);

    return work;
}

function exportMainAccount(user)
{
    return user;
}

function importUserMainAccountAndCreateCustomListener(user, importedUser)
{
    user["mainAccount"] = importedUser["mainAccount"];
    user["listenerAccount"] = createAccount();
    user["useListener"] = true;
}

function addRedirectToUser(user, listener)
{
    if (user["redirectAccounts"].indexOf(listener) == -1 && user["listenerAccount"]["userId"] != listener)
        user["redirectAccounts"].push(listener);
}

function clearRedirects(user)
{
    user["redirectAccounts"] = [];
}

function addRedirects(user, redirectAccounts)
{
    user["redirectAccounts"] = redirectAccounts;
}