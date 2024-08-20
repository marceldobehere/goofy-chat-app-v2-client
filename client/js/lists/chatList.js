const docChatList = document.getElementById("main-chat-content-list");
const docChatUlDiv = document.getElementById("main-chat-content-uldiv");
const inputElement = document.getElementById('main-chat-content-input');
const inputStatusElement = document.getElementById('main-chat-content-input-file-status');
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

function getReplyStr(message, userId)
{
    // Add a > infront of every line
    let lines = message.split("\n");
    let newLines = [];
    for (let line of lines)
        newLines.push(`> ${line}`);
    let tempUserStr = (settingsObj["chat"]["add-ping-reply"]) ? `\n\n@${userId}` : "\n";
    return newLines.join("\n")+`${tempUserStr}`;
}


function createChatEntry(username, msgObj, onlyReturn)
{
    let time = msgObj["date"];
    let message = msgObj["data"];
    let messageId = msgObj["messageId"]
    let userId = msgObj["from"];

    try {
        let mine = currentUser['mainAccount']['userId'] == userId;
        let li = document.createElement("li");
        li.id = `chat-msg-${messageId}`;
        let div = document.createElement("div");
        div.className = "chat-entry";
        let span1 = document.createElement("span");
        span1.className = "chat-entry-username";
        span1.textContent = username;
        let span2 = document.createElement("span");

        try {
            let utcDate = new Date(time);
            let localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
            time = isoDateToReadable(localDate.toISOString(), utcDate.toDateString() == new Date().toDateString());

            let editedTimeAddStr = "";
            let editedTime = msgObj["editDate"];
            if (editedTime != null) {
                let utcDate = new Date(editedTime);
                let localDate = new Date(utcDate.getTime() - utcDate.getTimezoneOffset() * 60000);
                let editedTimeStr = isoDateToReadable(localDate.toISOString(), utcDate.toDateString() == new Date().toDateString());
                editedTimeAddStr = ` - (edited ${editedTimeStr})`;
            }


            span2.textContent = time + editedTimeAddStr;
        } catch (e) {
            span2.textContent = "[Invalid Date]";
            console.warn("ERROR PARSING DATE: ", e);
        }

        let replyButton = document.createElement("button");
        replyButton.className = "chat-entry-reply";
        replyButton.textContent = "<-";
        replyButton.onclick = () => {
            docChatInputElement.value = `${getReplyStr(message, userId)}\n`;
            docChatInputElement.focus();
        };

        let deleteButton = document.createElement("button");
        deleteButton.className = "chat-entry-delete";
        deleteButton.textContent = "X";
        deleteButton.onclick = async () => {
            if (!confirm("Do you really want to delete this message?"))
                return;

            logInfo("DELETE MSG: " + messageId);
            await doMsgSendThingy("delete-msg", {messageId: messageId}, true);
            await internalRemoveUserMessage(currentUser['mainAccount'], getCurrentChatUserId(), messageId);
            await messageDeletedUI(currentUser['mainAccount'], getCurrentChatUserId(), messageId);
            docChatInputElement.focus();
        };

        let editButton = document.createElement("button");
        editButton.className = "chat-entry-edit";
        editButton.textContent = "E";
        editButton.onclick = async () => {
            let edited = prompt("Edit message:", message);
            if (edited == null)
                return;
            if (edited == message)
                return;
            if (edited == "")
                return; // TODO: Maybe delete?
            logInfo("EDIT MSG: " + messageId);

            await doMsgSendThingy("edit-msg", {messageId: messageId, message: edited}, true);
            let msg = await internalEditUserMessageText(currentUser['mainAccount'], getCurrentChatUserId(), messageId, edited);
            await messageEditedUI(currentUser['mainAccount'], getCurrentChatUserId(), messageId, msg["message"]);
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
            console.warn("ERROR RENDERING: ", message)
            p.textContent = `ERROR RENDERING MESSAGE: ${e.message}`;
        }

        div.appendChild(span1);
        div.appendChild(document.createTextNode(" - "));
        div.appendChild(span2);
        if (mine) {
            div.appendChild(deleteButton);
            div.appendChild(editButton);
        }
        div.appendChild(replyButton);
        div.appendChild(br);
        div.appendChild(p);
        li.appendChild(div);
        if (onlyReturn)
            return li;
        else
            docChatList.appendChild(li);
    } catch (e) {
        console.warn("ERROR CREATING CHAT ENTRY: ", e);
    }
 }


const docChatHeaderDeleteBtn = document.getElementById("main-chat-content-header-delete-chat");
async function refreshChatListArea(serverId, channelId)
{
    await updateChatInfo(serverId, channelId);

    docChatHeaderDeleteBtn.style.display = "none";
    let chatNameElement = document.getElementById("main-chat-content-header-toggle-chat-name");
    if (serverId == NoId || channelId == NoId)
    {
        inputElement.style.display = "none";
        inputStatusElement.style.display = "none";
        chatNameElement.textContent = "";
        return;
    }
    inputElement.style.display = "";
    inputStatusElement.style.display = "";

    if (serverId == DMsId)
    {
        docChatHeaderDeleteBtn.style.display = "";
        chatNameElement.textContent = `${userGetInfoDisplayUsername(currentUser['mainAccount'], channelId)}`;
    }
    else
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
}
async function refreshChatList() {
    console.log("Refreshing chat list");
    await createChatList(docChatLastServerId, docChatLastChannelId, false);
}
async function createChatList(serverId, channelId, scrollDown) {
    docChatList.innerHTML = "";
    docChatHeaderDeleteBtn.style.display = "none";
    await updateChatInfo(serverId, channelId);

    let chatNameElement = document.getElementById("main-chat-content-header-toggle-chat-name");
    if (serverId == NoId || channelId == NoId)
    {
        if (serverId == DMsId && getAllUsers().length == 0)
        {
            docChatList.innerHTML = "<br> Seems like you have no one to talk to :(<br><br>Consider adding some friends to chat with! (The \"Add friend\" button)<br><br><br>(You can also add yourself to chat with yourself)";
            chatNameElement.textContent = "No Friends";
        }
        else
        {
            docChatList.textContent = "[No chat open]";
            chatNameElement.textContent = "";
        }
        inputElement.style.display = "none";
        inputStatusElement.style.display = "none";
        return;
    }
    inputElement.style.display = "";
    inputStatusElement.style.display = "";

    clearAndHideFileStatList();

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
            createChatEntry(username, msg);
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
            createChatEntry(username, msg);
        }
    }


    if (scrollDown)
    {
        docChatUlDiv.scrollTop = docChatUlDiv.scrollHeight;
    }
}

async function channelClicked(element, channelId, serverId) {
    console.log(`Channel ${channelId} clicked`);

    try {
        if (docLastChannelEntry)
            docLastChannelEntry.classList.remove("chat-selector-entry-active");
        element.classList.add("chat-selector-entry-active");
    } catch (e) {
        console.warn("ERROR ADDING CLASS: ", e);
    }

    docLastChannelEntry = element;
    docLastChannelId = channelId;
    await updateChatInfo(serverId, channelId);

    if (settingsObj["chat"]["auto-hide-chat"])
        setChannelInfoVisibility(false);

    if (docChatLastChannelId != channelId || docChatLastServerId != serverId)
    {
        docChatLastServerId = serverId;
        docChatLastChannelId = channelId;
        await createChatList(docLastChannelServerId, channelId, true);

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
    }


    docChatInputElement.focus();
}

async function messageDeletedUI(account, chatUserId, messageId)
{
    if (chatUserId != getCurrentChatUserId())
        return;

    let li = document.getElementById(`chat-msg-${messageId}`);
    if (li)
        li.remove();
}

async function messageEditedUI(account, chatUserId, messageId, newMessage)
{
    if (chatUserId != getCurrentChatUserId())
        return;

    let li = document.getElementById(`chat-msg-${messageId}`);
    if (li)
    {
        let newLi = createChatEntry(userGetInfoDisplayUsername(currentUser['mainAccount'], newMessage["from"]), newMessage, true);

        li.replaceWith(newLi);
    }
}

async function openChat(serverId, channelId) {
    logInfo(`> Opening chat ${serverId} - ${channelId}`);

    docLastServerId = serverId;
    docLastChannelId = channelId;
    createServerList(docLastServerId);
    await createChannelList(docLastServerId, docLastChannelId, true);
    await createChatList(docLastServerId, docLastChannelId);

    let channelIdStr = `chat-selector-entry-${serverId}-${channelId}`;
    let element = document.getElementById(channelIdStr);
    if (element)
        element = element.getElementsByTagName("span")[0];
    await channelClicked(element, channelId, serverId);
}

function isAtBottom()
{
    return docChatUlDiv.scrollHeight - docChatUlDiv.scrollTop - docChatUlDiv.clientHeight < 140;
}

function scrollToBottom()
{
    docChatUlDiv.scrollTop = docChatUlDiv.scrollHeight;
}

async function messageReceivedUI(account, chatUserId, message)
{
    /*    console.log("MESSAGE RECEIVED")
        console.log(chatUserId);
        console.log(message);*/

    let mine = message["from"] == currentUser['mainAccount']['userId'];

    let shouldScroll = isAtBottom();
    if (isStrChannelFromGroup(chatUserId))
    {
        let groupInfo = getGroupAndChannelFromChannelStr(chatUserId);
        if (groupInfo == null)
            return;

        let username = userGetInfoDisplayUsername(currentUser['mainAccount'], message["from"]);
        if (docChatLastServerId == groupInfo["groupId"] && docChatLastChannelId == groupInfo["channelId"])
        {
            await userMarkGroupMessagesAsRead(groupInfo["groupId"], groupInfo["channelId"]);

            //await createChatList(groupInfo["groupId"], groupInfo["channelId"], true);
            await refreshChatListArea(groupInfo["groupId"], groupInfo["channelId"]);

            createChatEntry(username, message);
            if (shouldScroll)
                scrollToBottom();
        }

        if (!mine) {
            if (!windowVisible() ||
                !(docChatLastServerId == groupInfo["groupId"] && docChatLastChannelId == groupInfo["channelId"]))
                playNotificationSound();

            {
                if (hasGroupChatInfo(currentUser["mainAccount"], groupInfo["groupId"]))
                {
                    let info = getGroupChatInfo(currentUser['mainAccount'], groupInfo["groupId"]);
                    let channel = info["channels"].find(x => x["id"] ==  groupInfo["channelId"]);

                    showNotification(`${username} in ${info["groupName"]} - ${channel["name"]}`, message["data"], () => {
                        openChat(groupInfo["groupId"], groupInfo["channelId"]);
                    });
                }
                else
                    logError("Group not found")
            }
        }




        if (docLastServerId == groupInfo["groupId"])
            await createChannelList(groupInfo["groupId"], docChatLastChannelId, true);
    }
    else
    {
        let username = userGetInfoDisplayUsername(currentUser['mainAccount'], message["from"]);
        if (chatUserId == docChatLastChannelId && docChatLastServerId == DMsId)
        {
            await userMarkMessagesAsRead(chatUserId);

            //await createChatList(DMsId, chatUserId, true);
            await refreshChatListArea(DMsId, chatUserId);
            createChatEntry(username, message);
            if (shouldScroll)
                scrollToBottom();
        }

        if (!mine) {
            if (!windowVisible() ||
                !(chatUserId == docChatLastChannelId && docChatLastServerId == DMsId))
                playNotificationSound();

            showNotification(username, message["data"], () => {
                openChat(DMsId, chatUserId);
            });
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

    let deleteFiles = confirm("Do you also want to delete all files?");
    let dmUserId = docChatLastChannelId;

    await deleteDirectMessages(dmUserId);

    if (deleteFiles)
    {
        let files = await internalGetRawFiles(currentUser['mainAccount'], dmUserId);
        for (let file of files)
            await internalDeleteFile(currentUser['mainAccount'], dmUserId, file["fileId"]);
    }

    docChatLastChannelId = NoId;

    // TODO: Delete Symm keys


    await resetUiList();
}