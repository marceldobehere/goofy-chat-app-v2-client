function tryConformUserChatInfo(obj)
{
    if (obj == undefined) obj = {};
    // if (obj["chat"] == undefined) obj["chat"] = {};
    // if (obj["chat"]["auto-show-chat"] == undefined) obj["chat"]["auto-show-chat"] = true;
    // if (obj["chat"]["auto-hide-chat"] == undefined) obj["chat"]["auto-hide-chat"] = true;
    if (obj["baseNickname"] == undefined) obj["baseNickname"] = null;
    if (obj["overlayNickname"] == undefined) obj["overlayNickname"] = null;

    return obj;
}

function getUserChatInfo(account, userId)
{
    let info = loadAccountObjectOrCreateDefault(account, `USER_INFO_${userId}`, {});
    return tryConformUserChatInfo(info);
}

function setUserChatInfo(account, userId, obj)
{
    let info = tryConformUserChatInfo(obj);
    saveAccountObject(account, `USER_INFO_${userId}`, info);
}