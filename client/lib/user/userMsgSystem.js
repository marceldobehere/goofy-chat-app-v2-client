async function initUserMsgSystem()
{

}

function privateSymmKey(account)
{
    return hashString(account["private-key"])+"";
}


async function getUserMySymmKey(account, userId)
{
    if (userId == account["userId"])
        return privateSymmKey(account);

    await lockSymmKey.enable();
    try {
        let symmKey = loadAccountObject(account, `USER_MY_SYMM_KEY_${userId}`);
        logInfo(`Symm key for ${userId}:`, symmKey);
        if (symmKey == undefined)
        {
            symmKey = generateSymmKey();
            if (!await sendUserNewSymmKey(account, userId, symmKey))
            {
                logError(`Failed to send new symm key to ${userId}`);
                lockSymmKey.disable();
                return undefined;
            }
            logInfo(`Setting symm key for ${userId}:`, symmKey);
            await setUserMySymmKey(account, userId, symmKey);
        }

        lockSymmKey.disable();
        return symmKey;
    }
    catch (e) {
        lockSymmKey.disable();
        logError(e);
        return undefined;
    }
    lockSymmKey.disable();
}

async function setUserMySymmKey(account, userId, key, dontRedirect)
{
    let lastKey = loadAccountObject(account, `USER_MY_SYMM_KEY_${userId}`);
    if (lastKey == key)
        return;

    saveAccountObject(account, `USER_MY_SYMM_KEY_${userId}`, key);

    if (dontRedirect)
        return;

    // send read-message to redirects
    logInfo(`Sending remote-symm-key of ${userId} to redirects:`, key);
    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        data: {userId: userId, symmKey: key},
        type: "remote-my-symm-key"
    };

    let accountFrom = currentUser["mainAccount"];

    msg["date"] = new Date();
    msg["from"] = accountFrom["userId"];

    await addSentMessage(accountFrom, userId, msg, true);
}

async function getUserLastSymmKey(account, userId)
{
    if (userId == account["userId"])
        return privateSymmKey(account);

    return loadAccountObject(account, `USER_SYMM_KEY_${userId}`);
}

async function setUserLastSymmKey(account, userId, key, dontRedirect)
{
    let lastKey = await getUserLastSymmKey(account, userId);
    if (lastKey == key)
        return;

    saveAccountObject(account, `USER_SYMM_KEY_${userId}`, key);

    if (dontRedirect)
        return;

    // send read-message to redirects
    logInfo(`Sending remote-symm-key of ${userId} to redirects:`, key);
    let msg = {
        messageId: getRandomIntInclusive(0, 99999999999),
        data: {userId: userId, symmKey: key},
        type: "remote-symm-key"
    };

    let accountFrom = currentUser["mainAccount"];

    msg["date"] = new Date();
    msg["from"] = accountFrom["userId"];

    await addSentMessage(accountFrom, userId, msg, true);
}

async function messageIdInUser(account, userId, messageId)
{
    let messageIds = loadAccountObject(account, `USER_MSG_IDS_${userId}`);
    if (messageIds == undefined)
        messageIds = [];
    return messageIds.includes(messageId);
}

async function addMessageIdToUser(account, userId, messageId)
{
    let messageIds = loadAccountObject(account, `USER_MSG_IDS_${userId}`);
    if (messageIds == undefined)
        messageIds = [];
    messageIds.push(messageId);
    saveAccountObject(account, `USER_MSG_IDS_${userId}`, messageIds);
}

async function addMessageToUnread(account, userId, message)
{
    let messageId = message["messageId"];
    let fromId = message["from"];
    if (fromId == account["userId"])
        return logInfo(`Not adding message to unread for self:`, message);

    let messageIds = loadAccountObjectOrCreateDefault(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
    if (!messageIds.includes(messageId))
        messageIds.push(messageId);
    saveAccountObject(account, `USER_UNREAD_MSG_IDS_${userId}`, messageIds);
}

async function readMessages(account, userId)
{
    saveAccountObject(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
}

async function getUnreadMessages(account, userId)
{
    return loadAccountObjectOrCreateDefault(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
}

async function internalGetUserMessages(account, userId)
{
    let messages = loadAccountObject(account, `USER_MSGS_${userId}`);
    if (messages == undefined)
    {
        messages = [];
        saveAccountObject(account, `USER_MSGS_${userId}`);
    }

    return messages;
}

async function internalAddUserMessageSorted(account, userId, message)
{
    let messages = await internalGetUserMessages(account, userId);
    let date;
    try {
        date = new Date(message["date"]);
    }
    catch (e) {
        logWarn(`Invalid date:`, message);
        return;
    }

    let index = 0;
    for (let i = 0; i < messages.length; i++)
    {
        let msg = messages[i];
        let msgDate;
        try {
            msgDate = new Date(msg["date"]);
        }
        catch (e) {
            logWarn(`Invalid date:`, msg);
            continue;
        }

        if (msgDate < date)
            index = i + 1;
    }

    messages.splice(index, 0, message);
    saveAccountObject(account, `USER_MSGS_${userId}`, messages);

    if (message["from"] == account["userId"])
    {
        logInfo(`Message sent so marking messages as read: `, message)
        await readMessages(account, userId);
    }
}

async function internalRemoveUserMessage(account, userId, messageId)
{
    let messages = await internalGetUserMessages(account, userId);
    let newMessages = [];
    for (let i = 0; i < messages.length; i++)
    {
        let msg = messages[i];
        if (msg["messageId"] != messageId)
            newMessages.push(msg);
    }

    saveAccountObject(account, `USER_MSGS_${userId}`, newMessages);
}

const dontRedirectTypes = ["redirect", "call-start", "call-stop", "call-reply", "call-join", "call-join-fail", "ice-candidate"];

async function addMessageToUser(account, userIdFrom, chatUserId, message, date)
{
    message["date"] = date;
    message["from"] = userIdFrom;
    logInfo(`Adding message to user ${chatUserId}:`, message);
    let type = message["type"];
    let messageId = message["messageId"];
    if (messageId == undefined)
    {
        logWarn(`Message without messageId:`, message);
        return;
    }

    if (!await messageIdInUser(account, chatUserId, messageId) && !dontRedirectTypes.includes(type))
    {
        await addMessageIdToUser(account, chatUserId, messageId);

        if (currentUser["redirectAccounts"].length > 0)
        {
            let msg = {
                messageId: getRandomIntInclusive(0, 99999999999),
                data: message,
                type: "redirect"
            };


            for (let i = 0; i < currentUser["redirectAccounts"].length; i++)
            {
                let redirect = currentUser["redirectAccounts"][i];

                logInfo(`Redirecting message to ${redirect}:`, message);
                await _sendAesMessageToUser(account, redirect, msg, privateSymmKey(account));
            }
        }
    }
    else if (!dontRedirectTypes.includes(type))
    {
        logWarn(`Message already in user:`, message);
        return;
    }


    if (type == "symm-key")
    {
        logInfo("Setting symm key");
        let symmKey = message["symmKey"];
        await setUserLastSymmKey(account, chatUserId, symmKey);
    }
    else if (type == "text")
    {
        await addNormalMessageToUser(account, chatUserId, message, false);
    }
    else if (type == "redirect")
    {
        logInfo("Redirect message", message);

        if (message["to"] == undefined)
            await addMessageToUser(account, message["data"]["from"], message["data"]["from"], message["data"], message["data"]["date"]);
        else
            await addMessageToUser(account, account['userId'], message["to"], message["data"], message["data"]["date"]);
    }
    else if (type == "remote-symm-key")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid remote-symm-key message:", message);

        let newSymmKey = message["data"]["symmKey"];
        let remoteUserId = message["data"]["userId"];

        logInfo(`Setting remote symm key for ${remoteUserId}:`, newSymmKey);
        await setUserLastSymmKey(account, remoteUserId, newSymmKey, true);
    }
    else if (type == "remote-my-symm-key")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid remote-my-symm-key message:", message);

        let newSymmKey = message["data"]["symmKey"];
        let remoteUserId = message["data"]["userId"];

        logInfo(`Setting remote my symm key for ${remoteUserId}:`, newSymmKey);
        await setUserMySymmKey(account, remoteUserId, newSymmKey, true);
    }
    else if (type == "read-message")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid add-redirect message:", message);

        let readUserId = message["data"]["userId"];

        await readMessages(account, readUserId);
    }
    else if (type == "add-redirect")
    {
        if (message["from"] != account["userId"])
            return logWarn("Invalid add-redirect message:", message);

        let newUserId = message["data"]["userId"];
        currUserAddRedirect(newUserId);

        logInfo(`Adding User ${newUserId} to redirect list`);
    }
    else if (type == "call-start")
    {
        tryExtFn(extFnVcOnReceiveCallOffer, account, chatUserId, message["data"]);
    }
    else if (type == "call-stop")
    {
        tryExtFn(extFnVcOnReceiveHangup, account, chatUserId, message["data"]);
    }
    else if (type == "call-reply")
    {
        tryExtFn(extFnVcOnReceiveCallReply, account, chatUserId, message["data"]);
    }
    else if (type == "call-join")
    {
        tryExtFn(extFnVcOnMemberJoin, account, chatUserId, message["data"]);
    }
    else if (type == "call-join-fail")
    {
        tryExtFn(extFnVcOnMemberJoinFailed, account, chatUserId, message["data"]);
    }
    else if (type == "ice-candidate")
    {
        tryExtFn(extFnVcOnReceiveIceCandidate, account, chatUserId, message["data"]);
    }
    else
    {
        logWarn(`Unknown message type: ${type}`);
    }
}

async function addSentMessage(account, userIdTo, message, dontActuallyAdd)
{
    let type = message["type"];
    let messageId = message["messageId"];

    await readMessages(account, userIdTo);

    if (dontRedirectTypes.includes(type))
    {
        logInfo(`Not saving sent message to ${userIdTo}:`, message);
        return;
    }

    if (!await messageIdInUser(account, userIdTo, messageId))
    {
        await addMessageIdToUser(account, userIdTo, messageId);

        if (currentUser["redirectAccounts"].length > 0)
        {
            let msg = {
                messageId: getRandomIntInclusive(0, 99999999999),
                data: message,
                type: "redirect",
                to: userIdTo
            };

            for (let i = 0; i < currentUser["redirectAccounts"].length; i++)
            {
                let redirect = currentUser["redirectAccounts"][i];

                logInfo(`Redirecting message to ${redirect}:`, msg);
                await _sendAesMessageToUser(account, redirect, msg, privateSymmKey(account));
            }
        }
    }
    else if (!dontRedirectTypes.includes(type))
    {
        logWarn(`Message already in user:`, message);
        return;
    }

    logInfo(`New sent message to user ${userIdTo}:`, message);
    if (!dontActuallyAdd)
        await internalAddUserMessageSorted(account, userIdTo, message);
}

async function addNormalMessageToUser(account, chatUserId, message, isGroup)
{
    logInfo(`New message from user ${chatUserId}:`, message);
    if (isGroup)
        logWarn("Group messages not implemented yet");
    else
        addUserIdIfNotExists(chatUserId);


    await internalAddUserMessageSorted(account, chatUserId, message);
    await addMessageToUnread(account, chatUserId, message);
    tryExtFn(extMsgNormalMessage, account, chatUserId, message);
}

let extFnVcInit = undefined;
let extFnVcOnReceiveCallOffer = undefined;
let extFnVcOnReceiveHangup = undefined;
let extFnVcOnReceiveCallReply = undefined;
let extFnVcOnMemberJoin = undefined;
let extFnVcOnMemberJoinFailed = undefined;
let extFnVcOnReceiveIceCandidate = undefined;

let extMsgNormalMessage = undefined;
