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

async function internalResetAll()
{
    return await _intLockMethod(
        _lMsgDxResetAll,
        _lMsgLSResetAll,
        []
    );
}

async function internalMsgExportAll(account)
{
    return await _intLockMethod(
        _lMsgDxExportAllMsgs,
        _lMsgLSExportAllMsgs,
        [account]
    );
}

async function internalMsgImportAll(account, data)
{
    return await _intLockMethod(
        _lMsgDxImportAllMsgs,
        _lMsgLSImportAllMsgs,
        [account, data]
    );
}