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
    if (messageIds === undefined)
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

async function addMessageToUser(account, userIdTo, message)
{
    console.log(`Adding message to user ${userIdTo}:`, message);
}
