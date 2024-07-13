let db;

const localDbName = "GoofyChat2MsgDB";

async function _lMsgDxCreateDb()
{
    db = new Dexie(localDbName);

    await db.version(1).stores({
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

    await db.open();
}

async function initLocalMsgDexieInterface(account)
{
    let existed = await Dexie.exists(localDbName);
    let migrateData = undefined;
    if (!existed)
    {
        logInfo("Getting Migration Data...");
        migrateData = await _lMsgLSExportAllMsgs(account);
    }

    await _lMsgDxCreateDb();

    if (!existed)
    {
        logInfo("Migrating data to Dexie...");
        await _lMsgLSResetAll();
        await _lMsgDxImportAllMsgs(account, migrateData);
        logInfo("Migration done.");
    }
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

async function _lMsgDxGetMsgIds(account, userId)
{
    let temp = await db.msgIds.where({accountUserId: account["userId"], userId: userId}).toArray();
    let msgIds = [];
    for (let i = 0; i < temp.length; i++)
        msgIds.push(temp[i]["messageId"]);
    return msgIds;
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

    await _lMsgDxCreateDb();
}

async function _lMsgDxExportAllMsgs(account)
{
    let userList = getAllUsers().concat(getAllGroups());
    let msgList = [];
    let unreadList = [];
    let msgIdList = [];

    for (let user of userList)
    {
        let msgs = await _lMsgDxGetUserMsgs(account, user);
        for (let msg of msgs)
        {
            msg["chatId"] = user;
            msgList.push(msg);
        }

        let unread = await _lMsgDxGetUnreadMsgIds(account, user);
        for (let unreadId of unread)
        {
            unreadList.push({chatId:user, messageId:unreadId});
        }

        let msgIds = await _lMsgDxGetMsgIds(account, user);
        for (let msgId of msgIds)
        {
            msgIdList.push({chatId:user, messageId:msgId});
        }
    }


    return {
        messages: msgList,
        unread: unreadList,
        msgIds: msgIdList
    };
}

async function _lMsgDxImportAllMsgs(account, data)
{
    logInfo("DEXIE IMPORT:", data);
    let msgList = data["messages"];
    let unreadList = data["unread"];
    let msgIdList = data["msgIds"];

    for (let msg of msgList)
        await _lMsgDxAddMsg(account, msg["chatId"], msg);

    for (let unread of unreadList)
        await _lMsgDxAddMsgToUnread(account, unread["chatId"], unread);

    for (let msgId of msgIdList)
        await _lMsgDxAddMsgIdToUser(account, msgId["chatId"], msgId["messageId"]);
}


