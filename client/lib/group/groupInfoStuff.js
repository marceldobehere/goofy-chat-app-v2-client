function tryConformGroupChatInfo(obj)
{
    if (obj == undefined) obj = {};
    if (obj["groupName"] == undefined) obj["groupName"] = null;
    if (obj["groupId"] == undefined) obj["groupId"] = null;
    if (obj["members"] == undefined) obj["members"] = [];
    if (obj["admins"] == undefined) obj["admins"] = [];
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
    local["admins"] = received["admins"];

    return local;
}

function getGroupChatInfoToSend(obj)
{
    obj = tryConformGroupChatInfo(obj);

    let send = {};
    send["groupName"] = obj["groupName"];
    send["groupId"] = obj["groupId"];
    send["members"] = obj["members"];
    send["channels"] = obj["channels"];
    send["admins"] = obj["admins"];

    return send;
}

function hasGroupChatInfo(account, groupId)
{
    return loadAccountObject(account, `GROUP_INFO_${groupId}`) != null;
}

function getGroupChatInfo(account, groupId)
{
    let info = loadAccountObject(account, `GROUP_INFO_${groupId}`);
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

async function sendNewGroupChatInfoToAll(user, groupId)
{
    logInfo("Sending new group chat info to all");

    let account = user['mainAccount'];

    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);


    let members = info["members"];
    for (let member of members)
        await sendNewGroupChatInfoToOne(account, groupId, member);

    // send the update to all redirects
    let redirects = user["redirectAccounts"];
    for (let redirect of redirects)
        await sendNewGroupChatInfoToOne(account, groupId, redirect);
}

async function sendNewGroupChatInfoToOne(account, groupId, userId)
{
    logInfo(`Sending new group chat info to ${userId}`);

    if (!hasGroupChatInfo(account, groupId))
    {
        logError("Group not found");
        return;
    }
    let info = getGroupChatInfo(account, groupId);

    let send = getGroupChatInfoToSend(info);
    await sendSecureMessageToUser(account, userId, send, "group-chat-info", false, true);
}



function deleteGroupLocally(account, groupId)
{
    deleteGroupChatInfo(account, groupId);
    removeGroupIfExists(groupId);
}