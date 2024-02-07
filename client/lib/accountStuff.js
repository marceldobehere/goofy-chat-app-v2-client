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