async function initUserMsgSystem()
{

}

async function getUserMySymmKey(account, userId)
{
    let symmKey = loadAccountObject(account, `USER_MY_SYMM_KEY_${userId}`);
    if (symmKey == undefined)
    {
        symmKey = generateSymmKey();
        await setUserMySymmKey(account, userId, symmKey);
        await sendUserNewSymmKey(account, userId, symmKey);
    }

    return symmKey;
}

async function setUserMySymmKey(account, userId, key)
{
    saveAccountObject(account, `USER_MY_SYMM_KEY_${userId}`, key);
}

async function getUserLastSymmKey(account, userId)
{
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
    if (messageIds === undefined)
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

async function addMessageToUser(account, userIdTo, message, date)
{
    logInfo(`Adding message to user ${userIdTo}:`, message);
    let type = message["type"];

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
    else
    {
        logWarn(`Unknown message type: ${type}`);
    }
}

async function addNormalMessageToUser(account, userIdTo, message, date)
{
    message["date"] = date;
    message["from"] = userIdTo;
    let messageId = message["messageId"];
    if (messageId == undefined || await messageIdInUser(account, userIdTo, messageId))
    {
        logWarn(`Message already in user ${userIdTo}:`, message);
        return;
    }
    logInfo(`New message from user ${userIdTo}:`, message);
    await internalAddUserMessageSorted(account, userIdTo, message);
}