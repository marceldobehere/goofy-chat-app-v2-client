let db;

const localDbName = "GoofyChat2MsgDB";

async function _lMsgDxCreateDb()
{
    db = new Dexie(localDbName);

    if (isPasswordSecured)
    {
        logInfo("Using encrypted DB");
        const tables = ['messages', 'unread', 'msgIds'];
        const encryption = {
            encrypt: values => aesEncrypt(values, securedPasswordKey),
            decrypt: data => aesDecrypt(data, securedPasswordKey)
        };

        await dexieEncMiddleware({ db, encryption, tables });
        logInfo("Encrypted DB ready");
    }

    await db.version(2).stores({
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
        userId`,
        files: `
        &fileId,
        accountUserId,
        userId`,
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




async function _lMsgDxGetFiles(account, userId)
{
    let temp = await db.files.where({accountUserId: account["userId"], userId: userId}).toArray();

    // Filter out only files
    let files = [];
    for (let i = 0; i < temp.length; i++)
    {
        let tempFile = temp[i];
        let chunks = tempFile["chunks"];

        let newChunks = [];
        for (let chunkData of chunks)
        {
            let compressed = await compressBuffer(chunkData);
            let chunkStr = _arrayBufferToBase64(compressed);
            newChunks.push(chunkStr);
        }

        tempFile["chunks"] = newChunks;
        files.push(tempFile);
    }

    return files;
}

async function _lMsgDxSetFullFile(account, userId, fileId, data)
{
    let chunks = data["chunks"];
    let newChunks = [];
    for (let chunkStr of chunks)
    {
        let compressed = Uint8Array.from(atob(chunkStr), c => c.charCodeAt(0));
        let chunkData = await decompressBuffer(compressed);
        newChunks.push(chunkData);
    }
    data["chunks"] = newChunks;

    return await db.files.add({accountUserId: account["userId"], userId: userId, fileId: fileId, ...data});
}


function mergeUint8Arrays(...arrays) {
    const totalSize = arrays.reduce((acc, e) => acc + e.length, 0);
    const merged = new Uint8Array(totalSize);

    arrays.forEach((array, i, arrays) => {
        const offset = arrays.slice(0, i).reduce((acc, e) => acc + e.length, 0);
        merged.set(array, offset);
    });

    return merged;
}

async function _lMsgDxGetFile(account, userId, fileId)
{
    let res = await db.files.where({accountUserId: account["userId"], userId: userId, fileId: fileId}).toArray();
    if (res.length < 1)
        return undefined;
    res = res[0];

    logInfo(`> FILE ${fileId}:`, res);

    // TODO: Get Filename and filedata
    // Also decide on the format that filedata will be stored in
    let info = res["info"];
    let fileName = info["filename"];
    let fileSize = info["fileSize"];
    let chunkSize = info["chunkSize"];

    let fileData = mergeUint8Arrays(...res["chunks"]);
    let finished = fileData.length >= fileSize;

    return {
        filename: fileName,
        fileSize: fileSize,
        chunkSize: chunkSize,
        data: fileData,
        finished: finished
    };
}

async function _lMsgDxDeleteFile(account, userId, fileId)
{
    return await db.files.where({accountUserId: account["userId"], userId: userId, fileId: fileId}).delete();
}

async function _lMsgDxCreateFile(account, userId, fileId, info)
{
    // TODO: Validate info object
    // Create File Entry Object
    // With block array

    if (!info)
        return;

    let filename = info["filename"];
    let fileSize = info["fileSize"];
    const chunkSize = info["chunkSize"];
    let chunkCount = Math.ceil(fileSize / chunkSize);

    let infoObj = {
        filename: filename,
        fileSize: fileSize,
        chunkSize: chunkSize,
        chunkCount: chunkCount
    };

    let chunks = [];
    for (let i = 0; i < chunkCount; i++)
        chunks.push(new Uint8Array(0));

    return await db.files.add({accountUserId: account["userId"], userId: userId, fileId: fileId, info:infoObj, chunks:chunks});
}

async function _lMsgDxUploadFile(account, userId, fileId, data)
{
    // TODO: Implement
    // Get/Validate Upload Object
    // Get File Entry
    // Get Info
    // Validate Size and Block Index
    // Add the data
    // Save Object

    let res = await db.files.where({accountUserId: account["userId"], userId: userId, fileId: fileId}).toArray();
    if (res.length < 1)
        return;
    res = res[0];
    logInfo(`> UPLOAD FILE ${fileId}:`, res, data);

    let info = res["info"];
    let chunks = res["chunks"];

    let chunkSize = info["chunkSize"];
    let chunkData = data["chunkData"];
    if (chunkData.length > chunkSize) // could add check for == size and == filesize remainder on last index, but not super important
        return;
    logInfo(`> UPLOADING CHUNK1 ${data["chunkIndex"]}: ${chunkData.length} bytes`);


    let chunkIndex = data["chunkIndex"];
    if (chunkIndex < 0 || chunkIndex >= chunks.length)
        return;
    logInfo(`> UPLOADING CHUNK2 ${data["chunkIndex"]}: ${chunkData.length} bytes`);

    chunks[chunkIndex] = chunkData;

    return await db.files.update({accountUserId: account["userId"], userId: userId, fileId: fileId}, {chunks: chunks});
}










async function _lMsgDxExportAllMsgs(account)
{
    let userList = getAllUsers().concat(getAllGroupChannelIds(account));
    let msgList = [];
    let unreadList = [];
    let msgIdList = [];
    let fileList = [];

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
            unreadList.push({chatId:user, messageId:unreadId});

        let msgIds = await _lMsgDxGetMsgIds(account, user);
        for (let msgId of msgIds)
            msgIdList.push({chatId:user, messageId:msgId});

        let files = await _lMsgDxGetFiles(account, user);
        for (let file of files)
            fileList.push({chatId:user, fileData:file});
    }


    return {
        messages: msgList,
        unread: unreadList,
        msgIds: msgIdList,
        files: fileList
    };
}

async function _lMsgDxImportAllMsgs(account, data)
{
    logInfo("DEXIE IMPORT:", data);
    let msgList = data["messages"];
    let unreadList = data["unread"];
    let msgIdList = data["msgIds"];
    let fileList = data["files"];

    for (let msg of msgList)
        await _lMsgDxAddMsg(account, msg["chatId"], msg);

    for (let unread of unreadList)
        await _lMsgDxAddMsgToUnread(account, unread["chatId"], unread);

    for (let msgId of msgIdList)
        await _lMsgDxAddMsgIdToUser(account, msgId["chatId"], msgId["messageId"]);

    for (let file of fileList)
        await _lMsgDxSetFullFile(account, file["chatId"], file["fileData"]["fileId"], file["fileData"]);
}


