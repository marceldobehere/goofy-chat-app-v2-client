let userPubKeyDict = {};

function initUserPuKeyInterface()
{
    userPubKeyDict = loadObjectOrCreateDefault("userPubKeyDict", {});
}

async function getPublicKeyFromUser(userId)
{
    let pubKey = userPubKeyDict[userId];
    if (pubKey === undefined)
    {
        pubKey = await _getUserPubKey(userId);
        userPubKeyDict[userId] = pubKey;
        saveObject("userPubKeyDict", userPubKeyDict);
    }
    return pubKey;
}