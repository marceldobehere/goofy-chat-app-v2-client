function tryConformUserChatInfo(obj)
{
    if (obj == undefined) obj = {};
    // if (obj["chat"] == undefined) obj["chat"] = {};
    // if (obj["chat"]["auto-show-chat"] == undefined) obj["chat"]["auto-show-chat"] = true;
    // if (obj["chat"]["auto-hide-chat"] == undefined) obj["chat"]["auto-hide-chat"] = true;
    if (obj["baseNickname"] == undefined) obj["baseNickname"] = null; // from original user
    if (obj["overlayNickname"] == undefined) obj["overlayNickname"] = null; // from local user

    return obj;
}

function mergeUserChatInfo(local, received)
{
    local = tryConformUserChatInfo(local);
    received = tryConformUserChatInfo(received);

    local["baseNickname"] = received["baseNickname"];

    return local;
}

function getUserChatInfoToSend(obj)
{
    obj = tryConformUserChatInfo(obj);

    let send = {};
    send["baseNickname"] = obj["baseNickname"];

    return send;
}

function hasUserChatInfo(account, userId)
{
    return loadAccountObject(account, `USER_INFO_${userId}`) != null;
}

function getUserChatInfo(account, userId)
{
    let info = loadAccountObjectOrCreateDefault(account, `USER_INFO_${userId}`, {});
    return tryConformUserChatInfo(info);
}

function setUserChatInfo(account, userId, obj)
{
    let info = tryConformUserChatInfo(obj);
    saveAccountObject(account, `USER_INFO_${userId}`, info);
}

function deleteUserChatInfo(account, userId)
{
    deleteAccountObject(account, `USER_INFO_${userId}`);
}


function hasOwnUserChatInfo(user)
{
    return hasUserChatInfo(user['mainAccount'], user['mainAccount']["userId"]);
}

function getOwnUserChatInfo(user)
{
    return getUserChatInfo(user['mainAccount'], user['mainAccount']["userId"]);
}

function getOwnAccountChatInfo(acc)
{
    return getUserChatInfo(acc, acc["userId"]);
}

async function setOwnUserChatInfo(user, obj, send)
{
    setUserChatInfo(user['mainAccount'], user['mainAccount']["userId"], obj);

    if (send !== false)
        await sendNewOwnUserChatInfo(user);
}

async function sendNewOwnUserChatInfo(user)
{
    // send the new account info to all people
    logInfo("Sending new user chat info to all people.");

    let chatInfo = getOwnUserChatInfo(user);

    let users = getAllUsers();
    for (let userId of users)
        if (userId != user['mainAccount']["userId"] && userId != user['listenerAccount']["userId"])
            await sendNewUserChatInfo(user['mainAccount'], userId, chatInfo);

    // send the new account info to all redirects
    let redirects = user["redirectAccounts"];
    for (let userId of redirects)
        await sendNewUserChatInfo(user['mainAccount'], userId, chatInfo);
}

async function sendNewUserChatInfo(account, userId, chatInfo, skipLock)
{
    // send the new account info to one person
    logInfo(`Sending new user chat info to ${userId}.`);

    let data = chatInfo;
    await sendSecureMessageToUser(account, userId, data, "chat-info", false, true, skipLock);
}



function userGetInfoDisplayUsername(account, userId)
{
    let info = getUserChatInfo(account, userId);
    let username = `${userId}`;
    if (info["baseNickname"] != null)
        username = `${info["baseNickname"]} (${userId})`;
    if (info["overlayNickname"] != null)
        username = `${info["overlayNickname"]}`;

    return username;
}