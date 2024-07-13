let db;

async function initLocalMsgDexieInterface()
{
    db = new Dexie("GoofyChatMsgDB");

    db.version(1).stores({
        messages: `
        &messageId,
        accountUserId,
        userId`,
        unread:`
        &messageId,
        accountUserId,
        userId`,
        msgIds: `
        &messageId,
        accountUserId,
        userId`
    });
}

async function _lMsgDxMsgIdInUser(account, userId, msgId)
{
    let count = await db.msgIds.where({accountUserId: account["userId"], userId: userId, messageId: msgId}).count();
    return count > 0;
}

async function _lMsgDxAddMsgIdToUser(account, userId, msgId)
{
    return await db.msgIds.add({accountUserId: account["userId"], userId: userId, messageId: msgId});
}


async function _lMsgDxAddMsgToUnread(account, userId, msg)
{
    return await db.unread.add({accountUserId: account["userId"], userId: userId, messageId: msg["messageId"]});
}

async function _lMsgDxReadMsgs(account, userId)
{
    await db.unread.where({accountUserId: account["userId"], userId: userId}).delete();
}

async function _lMsgDxGetUnreadMsgIds(account, userId)
{
    // filter out only msgIds
    let temp = await db.unread.where({accountUserId: account["userId"], userId: userId}).toArray();
    let msgIds = [];
    for (let i = 0; i < temp.length; i++)
        msgIds.push(temp[i]["messageId"]);
    return msgIds;
}


async function _lMsgDxGetUserMsgs(account, userId) // sorted
{
    let temp = await db.messages.where({accountUserId: account["userId"], userId: userId}).toArray();

    // Filter out only messages
    let messages = [];
    for (let i = 0; i < temp.length; i++)
        messages.push(temp[i]["message"]);

    // Sort messages by date
    messages.sort((a, b) => new Date(a["date"]) - new Date(b["date"]));

    return messages;
}

async function _lMsgDxAddMsg(account, userId, msg)
{
    return await db.messages.add({accountUserId: account["userId"], userId: userId, messageId: msg["messageId"], message: msg});
}

async function _lMsgDxRemoveMsg(account, userId, msgId)
{
    return await db.messages.where({accountUserId: account["userId"], userId: userId, messageId: msgId}).delete();
}


async function _lMsgDxRemoveMsgs(account, userId)
{
    return await db.messages.where({accountUserId: account["userId"], userId: userId}).delete();
}

async function _lMsgDxResetAll()
{
    await db.delete();
}

async function _lMsgDxExportAllMsgs(account)
{
    return [];
}

async function _lMsgDxImportAllMsgs(account, data)
{
    throw new Error("Not implemented");
}


