async function initLocalMsgLocalStorageInterface()
{

}

async function _lMsgLSMsgIdInUser(account, userId, msgId)
{
    let messageIds = loadAccountObject(account, `USER_MSG_IDS_${userId}`);
    if (messageIds == undefined)
        messageIds = [];
    return messageIds.includes(msgId);
}

async function _lMsgLSAddMsgIdToUser(account, userId, msgId)
{
    let messageIds = loadAccountObject(account, `USER_MSG_IDS_${userId}`);
    if (messageIds == undefined)
        messageIds = [];
    messageIds.push(msgId);
    saveAccountObject(account, `USER_MSG_IDS_${userId}`, messageIds);
}


async function _lMsgLSAddMsgToUnread(account, userId, msg)
{
    let messageId = msg["messageId"];
    let fromId = msg["from"];
    if (fromId == account["userId"])
        return logInfo(`Not adding message to unread for self:`, msg);

    let messageIds = loadAccountObjectOrCreateDefault(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
    if (!messageIds.includes(messageId))
        messageIds.push(messageId);
    saveAccountObject(account, `USER_UNREAD_MSG_IDS_${userId}`, messageIds);
}

async function _lMsgLSReadMsgs(account, userId)
{
    saveAccountObject(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
}

async function _lMsgLSGetUnreadMsgIds(account, userId)
{
    return loadAccountObjectOrCreateDefault(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
}


async function _lMsgLSGetUserMsgs(account, userId)
{
    let messages = loadAccountObject(account, `USER_MSGS_${userId}`);
    if (messages == undefined)
    {
        messages = [];
        saveAccountObject(account, `USER_MSGS_${userId}`, messages);
    }

    return messages;
}

async function _lMsgLSAddMsg(account, userId, message)
{
    let messages = await _lMsgLSGetUserMsgs(account, userId);
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

async function _lMsgLSRemoveMsg(account, userId, msgId)
{
    let messages = await _lMsgLSGetUserMsgs(account, userId);
    let newMessages = [];
    for (let i = 0; i < messages.length; i++)
    {
        let msg = messages[i];
        if (msg["messageId"] != msgId)
            newMessages.push(msg);
    }

    saveAccountObject(account, `USER_MSGS_${userId}`, newMessages);
}


async function _lMsgLSRemoveMsgs(account, userId)
{
    saveAccountObject(account, `USER_MSGS_${userId}`, []);
    saveAccountObject(account, `USER_UNREAD_MSG_IDS_${userId}`, []);
    saveAccountObject(account, `USER_MSG_IDS_${userId}`, []);
}

async function _lMsgLSResetAll()
{

}