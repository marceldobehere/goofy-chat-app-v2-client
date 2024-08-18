const docChatInfo = document.getElementById("main-chat-info-body");

async function updateChatInfo(serverId, channelId)
{
    if (serverId == NoId || channelId == NoId)
    {
        docChatInfo.innerHTML = "[No chat open]";
        return;
    }

    if (serverId != DMsId)
    {
        docChatInfo.innerHTML = "";

        if (!hasGroupChatInfo(currentUser["mainAccount"], serverId))
        {
            docChatInfo.textContent = `Group ${serverId} not found`;
            return;
        }
        let info = getGroupChatInfo(currentUser["mainAccount"], serverId);
        let channel = info["channels"].find(x => x["id"] == channelId);

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Group Id: ${serverId}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);
        }

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Group Name: ${info["groupName"]}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);
        }

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Channel Id: ${channelId}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);
        }

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Channel Name: ${channel["name"]}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);
        }

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Channel Info:`;
            let pre = document.createElement("pre");
            let text = JSON.stringify(channel, null, 2);
            pre.textContent = text;
            div.appendChild(span);
            div.appendChild(pre);
            docChatInfo.appendChild(div);
        }

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Group Info:`;
            let pre = document.createElement("pre");
            let text = JSON.stringify(info, null, 2);
            pre.textContent = text;
            div.appendChild(span);
            div.appendChild(pre);
            docChatInfo.appendChild(div);
        }
    }
    else
    {
        docChatInfo.innerHTML = "";

        {
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `User Info: ${channelId}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);
        }

        {
            let nick = getUserChatInfo(currentUser["mainAccount"], channelId)["baseNickname"];
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Remote Nickname: ${nick}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);
        }

        {
            let nick = getUserChatInfo(currentUser["mainAccount"], channelId)["overlayNickname"];
            let div = document.createElement("div");
            let span = document.createElement("span");
            span.textContent = `Local Nickname: ${nick}`;
            div.appendChild(span);
            docChatInfo.appendChild(div);

            let btn = document.createElement("button");
            btn.textContent = "Change Nickname";
            btn.onclick = async () => {
                let nick = prompt("Enter new nickname:");
                if (nick == null)
                    return;
                if (nick == "")
                    nick = null;
                let info = getUserChatInfo(currentUser["mainAccount"], channelId);
                info["overlayNickname"] = nick;
                await setUserChatInfo(currentUser["mainAccount"], channelId, info);
                //await channelClicked(docLastChannelEntry, channelId, DMsId);
                await createChannelList(docLastServerId, docLastChannelId, true);
                await createChatList(docChatLastServerId, docChatLastChannelId, true);
            };
            div.appendChild(btn);
        }

        {
            let userInfo = await userGetDirectMessageInfo(channelId);
            let div = document.createElement("div");
            let pre = document.createElement("pre");
            let text = JSON.stringify(userInfo, null, 2);
            pre.textContent = text;
            div.appendChild(pre);
            docChatInfo.appendChild(div);
        }

        {
            let pubKey = await getPublicKeyFromUser(channelId);
            let div = document.createElement("div");
            let pre = document.createElement("pre");
            pre.textContent = `Public Key: ${pubKey}`;
            div.appendChild(pre);
            docChatInfo.appendChild(div);
        }
    }
}

function setChatInfoVisibility(visible)
{
    rootElement.style.setProperty("--main-chat-show-info", visible ? "1" : "0");
}
function toggleChatInfoVis()
{
    let visible = getComputedStyle(rootElement).getPropertyValue("--main-chat-show-info");
    console.log(visible)
    setChatInfoVisibility(visible == 0);
}


function promptUntilText(text)
{
    while (true)
    {
        let res = prompt(text);
        if (res != null && res != "")
            return res;
    }
}

async function askOwnChatInfo()
{
    await setStatus("Request Info")
    let chatInfo = getOwnUserChatInfo(currentUser);

    alert('Initial Account Stuff');
    let baseNickname = promptUntilText("Enter your nickname:");

    chatInfo["baseNickname"] = baseNickname;

    await setOwnUserChatInfo(currentUser, chatInfo, false);
}