const localMsgIntUseDexie = true;

async function initLocalMsgInterface(account)
{
    if (localMsgIntUseDexie)
        await initLocalMsgDexieInterface(account);
    else
        await initLocalMsgLocalStorageInterface(account);
}


async function _intLockMethod(funcDx, funcLS, args)
{
    await locklocalMsg.enable();
    let res;
    try {
        if (localMsgIntUseDexie)
            res = await funcDx(...args);
        else
            res = await funcLS(...args);
    }
    catch (e) {
        logError(e);
        res = undefined;
    }
    locklocalMsg.disable();
    return res;
}


async function messageIdInUser(account, userId, messageId)
{
    return await _intLockMethod(
        _lMsgDxMsgIdInUser,
        _lMsgLSMsgIdInUser,
        [account, userId, messageId]
    );
}

async function addMessageIdToUser(account, userId, messageId)
{
    return await _intLockMethod(
        _lMsgDxAddMsgIdToUser,
        _lMsgLSAddMsgIdToUser,
        [account, userId, messageId]
    );
}

async function addMessageToUnread(account, userId, message)
{
    return await _intLockMethod(
        _lMsgDxAddMsgToUnread,
        _lMsgLSAddMsgToUnread,
        [account, userId, message]
    );
}

async function readMessages(account, userId)
{
    return await _intLockMethod(
        _lMsgDxReadMsgs,
        _lMsgLSReadMsgs,
        [account, userId]
    );
}

async function getUnreadMessages(account, userId)
{
    return await _intLockMethod(
        _lMsgDxGetUnreadMsgIds,
        _lMsgLSGetUnreadMsgIds,
        [account, userId]
    );
}

async function internalGetUserMessages(account, userId)
{
    return await _intLockMethod(
        _lMsgDxGetUserMsgs,
        _lMsgLSGetUserMsgs,
        [account, userId]
    );
}

async function internalGetUserMessage(account, userId, messageId)
{
    return await _intLockMethod(
        _lMsgDxGetUserMsg,
        undefined,
        [account, userId, messageId]
    );
}

async function internalAddUserMessageSorted(account, userId, message)
{
    return await _intLockMethod(
        _lMsgDxAddMsg,
        _lMsgLSAddMsg,
        [account, userId, message]
    );
}

async function internalRemoveUserMessage(account, userId, messageId)
{
    return await _intLockMethod(
        _lMsgDxRemoveMsg,
        _lMsgLSRemoveMsg,
        [account, userId, messageId]
    );
}

async function internalRemoveUserMessages(account, userId)
{
    await _intLockMethod(
        _lMsgDxRemoveMsgs,
        _lMsgLSRemoveMsgs,
        [account, userId]
    );

    removeUserIfExists(userId);
}

async function internalEditUserMessage(account, userId, messageId, message)
{
    return await _intLockMethod(
        _lMsgDxEditMsg,
        undefined,
        [account, userId, messageId, message]
    );
}

async function internalEditUserMessageText(account, userId, messageId, newText) {
    let msg = await internalGetUserMessage(account, userId, messageId);
    if (msg == null)
    {
        logError("Message not found");
        return;
    }
    msg["message"]["data"] = newText;
    msg["message"]["editDate"] = new Date();
    await internalEditUserMessage(account, userId, messageId, msg["message"]);
    return msg;
}

async function internalGetFile(account, userId, fileId)
{
    return await _intLockMethod(
        _lMsgDxGetFile,
        undefined,
        [account, userId, fileId]
    );
}

async function internalGetRawFiles(account, userId)
{
    return await _intLockMethod(
        _lMsgDxGetRawFiles,
        undefined,
        [account, userId]
    );
}

async function internalGetAllRawFiles(account)
{
    return await _intLockMethod(
        _lMsgDxGetAllRawFiles,
        undefined,
        [account]
    );
}

async function internalHasFile(account, userId, fileId)
{
    return await _intLockMethod(
        _lMsgDxHasFile,
        undefined,
        [account, userId, fileId]
    );
}

async function internalDeleteFile(account, userId, fileId)
{
    return await _intLockMethod(
        _lMsgDxDeleteFile,
        undefined,
        [account, userId, fileId]
    );
}

async function internalCreateFile(account, userId, fileId, info)
{
    return await _intLockMethod(
        _lMsgDxCreateFile,
        undefined,
        [account, userId, fileId, info]
    );
}

async function internalUploadFile(account, userId, fileId, obj)
{
    return await _intLockMethod(
        _lMsgDxUploadFile,
        undefined,
        [account, userId, fileId, obj]
    );
}


async function internalUploadFileAllChunks(account, userId, fileId, chunks)
{
    return await _intLockMethod(
        _lMsgDxUploadFileAllChunks,
        undefined,
        [account, userId, fileId, chunks]
    );
}




async function internalResetAll()
{
    return await _intLockMethod(
        _lMsgDxResetAll,
        _lMsgLSResetAll,
        []
    );
}

async function internalMsgExportAll(account, includeFiles)
{
    let res = await _intLockMethod(
        _lMsgDxExportAllMsgs,
        _lMsgLSExportAllMsgs,
        [account, includeFiles]
    );

    try {
        if (isPasswordSecured)
            res = aesEncrypt(res, securedPasswordKey);
    } catch (e) {
        logError(e);
        return undefined;
    }

    return res;
}

async function internalMsgImportAll(account, data)
{
    try {
        if (isPasswordSecured)
            data = aesDecrypt(data, securedPasswordKey);
    } catch (e) {
        logError(e);
        return;
    }

    return await _intLockMethod(
        _lMsgDxImportAllMsgs,
        _lMsgLSImportAllMsgs,
        [account, data]
    );
}