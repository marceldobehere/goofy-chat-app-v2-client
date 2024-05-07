function tryConformGroupChatInfo(obj)
{
    if (obj == undefined) obj = {};
    if (obj["groupName"] == undefined) obj["groupName"] = null;
    if (obj["groupId"] == undefined) obj["groupId"] = null;
    if (obj["members"] == undefined) obj["members"] = [];
    if (obj["channels"] == undefined) obj["channels"] = [];

    return obj;
}

function mergeGroupChatInfo(local, received)
{
    local = tryConformGroupChatInfo(local);
    received = tryConformGroupChatInfo(received);

    local["groupName"] = received["groupName"];
    local["members"] = received["members"];
    local["channels"] = received["channels"];

    return local;
}

function getGroupChatInfoToSend(obj)
{
    obj = tryConformGroupChatInfo(obj);

    let send = {};
    send["groupName"] = obj["groupName"];
    send["members"] = obj["members"];
    send["channels"] = obj["channels"];

    return send;
}

function hasGroupChatInfo(account, groupId)
{
    return loadAccountObject(account, `GROUP_INFO_${groupId}`) != null;
}

function getGroupChatInfo(account, groupId)
{
    let info = loadAccountObjectOrCreateDefault(account, `GROUP_INFO_${groupId}`, {});
    return tryConformGroupChatInfo(info);
}

function setGroupChatInfo(account, groupId, obj)
{
    let info = tryConformGroupChatInfo(obj);
    saveAccountObject(account, `GROUP_INFO_${groupId}`, info);
}

function deleteGroupChatInfo(account, groupId)
{
    deleteAccountObject(account, `GROUP_INFO_${groupId}`);
}

