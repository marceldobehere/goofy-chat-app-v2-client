const docChatList = document.getElementById("main-chat-content-list");
const docChatUlDiv = document.getElementById("main-chat-content-uldiv");
let docChatLastServerId = NoId;
let docChatLastChannelId = NoId;

function isoDateToReadable(isoDateStr, isToday)
{
    let tempStr = isoDateStr.slice(0, 19).replace("T", " ");
    let parts = tempStr.split(" ");
    let dateStr;
    if (isToday)
        dateStr = "Today";
    else
    {
        let dateParts = parts[0].split("-");
        dateStr = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
    }

    let timeStr = parts[1];
    let timeParts = timeStr.split(":");
    timeStr = `${timeParts[0]}:${timeParts[1]}`;

    return `${dateStr} at ${timeStr}`;
}

function getReplyStr(message)
{
    // Add a > infront of every line
    let lines = message.split("\n");
    let newLines = [];
    for (let line of lines)
        newLines.push(`> ${line}`);
    let tempUserStr = "";//`\n\n@${('USER')}`;
    return newLines.join("\n")+`${tempUserStr}\n`;
}


function createChatEntry(username, time, message)
{
    let li = document.createElement("li");
    let div = document.createElement("div");
    div.className = "chat-entry";
    let span1 = document.createElement("span");
    span1.className = "chat-entry-username";
    span1.textContent = username;
    let span2 = document.createElement("span");

    let utcDate = new Date(time);
    let localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
    time = isoDateToReadable(localDate.toISOString(), utcDate.toDateString() == new Date().toDateString());
    span2.textContent = time;

    let replyButton = document.createElement("button");
    replyButton.className = "chat-entry-reply";
    replyButton.textContent = "<-";
    replyButton.onclick = () => {
        docChatInputElement.value = `${getReplyStr(message)}\n`;
        docChatInputElement.focus();
    };

    let br = document.createElement("br");
    let p = document.createElement("p");
    p.className = "chat-entry-message";

    //message = message.replaceAll("\n", "\n\n");
    //message = message.replaceAll("\n\n>", "\n>");

    try {
        const dirty = marked.parse(message);
        const clean = DOMPurify.sanitize(dirty, { ADD_ATTR: ['target'] });
        p.innerHTML = clean;
    } catch (e) {
        logError("Error rendering content:", e);
        p.textContent = `ERROR RENDERING MESSAGE: ${e.message}`;
    }

    div.appendChild(span1);
    div.appendChild(document.createTextNode(" - "));
    div.appendChild(span2);
    div.appendChild(replyButton);
    div.appendChild(br);
    div.appendChild(p);
    li.appendChild(div);
    docChatList.appendChild(li);
}

const docChatHeaderDeleteBtn = document.getElementById("main-chat-content-header-delete-chat");
async function createChatList(serverId, channelId, scrollDown) {
    docChatList.innerHTML = "";
    docChatHeaderDeleteBtn.style.display = "none";
    await updateChatInfo(serverId, channelId);

    let chatNameElement = document.getElementById("main-chat-content-header-toggle-chat-name");
    let inputElement = document.getElementById('main-chat-content-input');
    if (serverId == NoId || channelId == NoId)
    {
        docChatList.textContent = "[No chat open]";
        inputElement.style.display = "none";
        chatNameElement.textContent = "";
        return;
    }
    inputElement.style.display = "";

    if (serverId == DMsId)
    {
        docChatHeaderDeleteBtn.style.display = "";
        chatNameElement.textContent = `${userGetInfoDisplayUsername(currentUser['mainAccount'], channelId)}`;

        let messages = await userGetMessages(channelId);
        if (messages == null)
            return;
        console.log(messages);

        for (let i = 0; i < messages.length; i++)
        {
            let msg = messages[i];
            let username = userGetInfoDisplayUsername(currentUser['mainAccount'], msg["from"]);
            createChatEntry(username, msg["date"], msg["data"]);
        }
    }
    else
    {
        {
            if (!hasGroupChatInfo(currentUser["mainAccount"], serverId))
            {
                logError("Group not found");
                return;
            }
            let info = getGroupChatInfo(currentUser['mainAccount'], serverId);

            let channel = info["channels"].find(x => x["id"] == channelId);

            // Server name and channel name
            chatNameElement.textContent = `${info["groupName"]} - ${channel["name"]}`;
        }

        let messages = await userGetGroupMessages(serverId, channelId);
        if (messages == null)
            return;

        for (let i = 0; i < messages.length; i++)
        {
            let msg = messages[i];
            let username = userGetInfoDisplayUsername(currentUser['mainAccount'], msg["from"]);
            createChatEntry(username, msg["date"], msg["data"]);
        }

        // for (let i = 0; i < 30; i++)
        //     createChatEntry(`User ${i}`, "2024-04-27T17:43:03.164Z", `Test Message ${i} for chat ${channelId}`);
    }


    if (scrollDown)
    {
        docChatUlDiv.scrollTop = docChatUlDiv.scrollHeight;
    }
}

async function channelClicked(element, channelId, serverId) {
    console.log(`Channel ${channelId} clicked`);
    if (docLastChannelEntry)
        docLastChannelEntry.classList.remove("chat-selector-entry-active");
    element.classList.add("chat-selector-entry-active");
    docLastChannelEntry = element;
    docLastChannelId = channelId;
    docChatLastServerId = serverId;
    docChatLastChannelId = channelId;

    await createChatList(docLastChannelServerId, channelId, true);
    if (settingsObj["chat"]["auto-hide-chat"])
        setChannelInfoVisibility(false);

    if (serverId == DMsId)
    {
        await userMarkMessagesAsRead(channelId);
        await createChannelList(DMsId, channelId, true);
    }
    else if (serverId != NoId)
    {
        await userMarkGroupMessagesAsRead(serverId, channelId);
        await createChannelList(serverId, channelId, true);
    }

    docChatInputElement.focus();
}

async function messageReceivedUI(account, chatUserId, message)
{
    /*    console.log("MESSAGE RECEIVED")
        console.log(chatUserId);
        console.log(message);*/
    if (isStrChannelFromGroup(chatUserId))
    {
        let groupInfo = getGroupAndChannelFromChannelStr(chatUserId);
        if (groupInfo == null)
            return;

        if (docLastServerId == groupInfo["groupId"] && docLastChannelId == groupInfo["channelId"])
        {
            await userMarkGroupMessagesAsRead(groupInfo["groupId"], groupInfo["channelId"]);

            //await createChatList(groupInfo["groupId"], groupInfo["channelId"], true);
            await createChatEntry(userGetInfoDisplayUsername(currentUser['mainAccount'], message["from"]), message["date"], message["data"]);
            docChatUlDiv.scrollTop = docChatUlDiv.scrollHeight;
        }


        if (docLastServerId == groupInfo["groupId"])
            await createChannelList(groupInfo["groupId"], docChatLastChannelId, true);
    }
    else
    {
        if (chatUserId == docChatLastChannelId && docChatLastServerId == DMsId)
        {
            await userMarkMessagesAsRead(chatUserId);

            //await createChatList(DMsId, chatUserId, true);
            await createChatEntry(userGetInfoDisplayUsername(currentUser['mainAccount'], message["from"]), message["date"], message["data"]);
            docChatUlDiv.scrollTop = docChatUlDiv.scrollHeight;
        }

        if (docLastServerId == DMsId)// && (await userGetMessages(chatUserId)).length == 1)
            await createChannelList(DMsId, docLastChannelId, true);
    }
}

async function deleteCurrDm()
{
    if (docChatLastServerId == NoId || docChatLastChannelId == NoId)
        return;

    if (docChatLastServerId != DMsId)
        return;

    if (!confirm("Do you really want to delete this chat?"))
        return;

    await deleteDirectMessages(docChatLastChannelId);

    await resetUiList();
}