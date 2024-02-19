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

    let symmKey = loadAccountObject(account, `USER_MY_SYMM_KEY_${userId}`);
    if (symmKey == undefined)
    {
        symmKey = generateSymmKey();
        if (!await sendUserNewSymmKey(account, userId, symmKey))
        {
            logError(`Failed to send new symm key to ${userId}`);
            return undefined;
        }
        await setUserMySymmKey(account, userId, symmKey);
    }

    return symmKey;
}

async function setUserMySymmKey(account, userId, key)
{
    saveAccountObject(account, `USER_MY_SYMM_KEY_${userId}`, key);
}

async function getUserLastSymmKey(account, userId)
{
    if (userId == account["userId"])
        return privateSymmKey(account);

    return loadAccountObject(account, `USER_SYMM_KEY_${userId}`);
}

async function setUserLastSymmKey(account, userId, key)
{
    saveAccountObject(account, `USER_SYMM_KEY_${userId}`, key);
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

const dontRedirectTypes = ["redirect", "call-start", "call-stop", "call-reply", "call-join", "ice-candidate"];

async function addMessageToUser(account, userIdTo, message, date)
{
    message["date"] = date;
    message["from"] = userIdTo;
    logInfo(`Adding message to user ${userIdTo}:`, message);
    let type = message["type"];
    let messageId = message["messageId"];
    if (messageId == undefined)
    {
        logWarn(`Message without messageId:`, message);
        return;
    }

    if (!await messageIdInUser(account, userIdTo, messageId) && !dontRedirectTypes.includes(type))
    {
        await addMessageIdToUser(account, userIdTo, messageId);

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
        await setUserLastSymmKey(account, userIdTo, symmKey);
    }
    else if (type == "text")
    {
        await addNormalMessageToUser(account, userIdTo, message, date);
    }
    else if (type == "redirect")
    {
        logInfo("Redirect message", message);
        //logError("NO REDIRECT IMPLEMENTED!");
        await addMessageToUser(account, message["data"]["from"], message["data"], message["data"]["date"]);
    }
    else if (type == "call-start")
    {
        try {
            await VCTEST_onReceiveCallOffer(account, userIdTo, message["data"]);
        }
        catch (e) {
            logError(e);
        }
    }
    else if (type == "call-stop")
    {
        try {
            await VCTEST_onReceiveHangup(account, userIdTo, message["data"]);
        }
        catch (e) {
            logError(e);
        }
    }
    else if (type == "call-reply")
    {
        try {
            await VCTEST_onReceiveCallReply(account, userIdTo, message["data"]);
        }
        catch (e) {
            logError(e);
        }
    }
    else if (type == "call-join")
    {
        try {
            await VCTEST_onMemberJoined(account, userIdTo, message["data"]);
        }
        catch (e) {
            logError(e);
        }
    }
    else if (type == "ice-candidate")
    {
        try {
            await VCTEST_onReceiveIceCandidate(account, userIdTo, message["data"]);
        }
        catch (e) {
            logError(e);
        }
    }
    else
    {
        logWarn(`Unknown message type: ${type}`);
    }
}

async function addNormalMessageToUser(account, userIdTo, message)
{
    logInfo(`New message from user ${userIdTo}:`, message);
    await internalAddUserMessageSorted(account, userIdTo, message);
}