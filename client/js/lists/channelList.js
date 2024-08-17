const docChannelList = document.getElementById("main-chat-selector-list");
let docLastChannelEntry = null;
let docLastChannelId = NoId;
let docLastChannelServerId = NoId;

async function createChannelEntry(channelId, channelName, serverId, shouldHighlight) {
    let li = document.createElement("li");
    let span = document.createElement("span");
    span.className = "chat-selector-entry";
    if (channelId != NoId)
        span.onclick = async () => {
            await channelClicked(span, channelId, serverId);
        };

    if (shouldHighlight)
    {
        span.classList.add("chat-selector-entry-active");
        docLastChannelEntry = span;
        docLastChannelId = channelId;
        docLastChannelServerId = serverId;
    }

    let notCount = 0;
    if (channelId != NoId)
    {
        if (serverId == DMsId)
            notCount = (await userGetUnreadMessages(channelId)).length;
        else
            notCount = (await userGetGroupUnreadMessages(serverId, channelId)).length;
    }



    let chanText = channelName;
    if (notCount > 0)
    {
        chanText += ` (${notCount})`;
        span.classList.add("chat-selector-entry-not");
    }

    span.textContent = chanText;

    li.appendChild(span);
    docChannelList.appendChild(li);
}

async function createChannelList(serverId, selectedChatId, forceRefresh) {
    if (serverId == docLastChannelServerId && !forceRefresh)
        return;
    docLastChannelServerId = serverId;

    docChannelList.innerHTML = "";
    docLastChannelEntry = null;
    docLastChannelId = NoId;
    if (serverId == NoId)
        return;


    if (serverId == DMsId)
    {
        let userIds = getAllUsers();
        for (let i = 0; i < userIds.length; i++)
        {
            let username = userGetInfoDisplayUsername(currentUser['mainAccount'], userIds[i]);
            await createChannelEntry(userIds[i], username, serverId, selectedChatId == userIds[i]);
        }
        if (userIds.length == 0)
            await createChannelEntry(NoId, "No Friends", serverId, true);
    }
    else
    {
        if (!hasGroupChatInfo(currentUser["mainAccount"], serverId))
        {
            logError("Group not found");
            return;
        }
        let info = getGroupChatInfo(currentUser['mainAccount'], serverId);

        for (let channel of info["channels"])
            await createChannelEntry(channel["id"], channel["name"], serverId, selectedChatId == channel["id"]);
    }

    if (docChatLastChannelId == NoId)
        await refreshChatList();
}

function setChannelInfoVisibility(visible)
{
    rootElement.style.setProperty("--main-chat-show-selector", visible ? "1" : "0");
}

function toggleChannelInfoVis()
{
    let visible = getComputedStyle(rootElement).getPropertyValue("--main-chat-show-selector");
    console.log(visible)
    setChannelInfoVisibility(visible == 0);
}

function getChannelInfoVis()
{
    let visible = getComputedStyle(rootElement).getPropertyValue("--main-chat-show-selector");
    return visible == 1;
}