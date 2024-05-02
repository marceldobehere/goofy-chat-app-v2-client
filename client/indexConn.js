const hoverElement = document.getElementById("goofy-server-popup");
function serverHoverStart(element, serverName) {
    hoverElement.style.display = "block";
    let rect1 = element.getBoundingClientRect();
    let rect2 = hoverElement.getBoundingClientRect();

    hoverElement.style.left = rect1.x + rect1.width + 10 + "px";
    let y = rect1.y + (rect1.height - rect2.height) / 2;
    hoverElement.style.top = y + "px";
    hoverElement.textContent = serverName;
}

function serverHoverEnd() {
    hoverElement.style.display = "none";
}






const NoId = -10;


const DMsId = -1;
const docServerList = document.getElementById("main-sidebar-list");
let docLastServerEntry = null;
let docLastServerId = NoId;
// <li><img src="./assets/imgs/dm.png" class="sidebar-entry" onmouseover="serverHoverStart(this, 'A')" onmouseleave="serverHoverEnd()"></li>
function createServerEntry(imgSrc, serverId, serverName, shouldHighlight) {
    let li = document.createElement("li");
    let img = document.createElement("img");
    img.src = imgSrc;
    img.className = "sidebar-entry";
    img.onmouseover = () => {
        serverHoverStart(img, serverName)
    };
    img.onmouseleave = serverHoverEnd;
    img.onclick = () => {
        serverClicked(img, serverId)
    };

    if (shouldHighlight)
    {
        img.classList.add("sidebar-entry-active");
        docLastServerEntry = img;
        docLastServerId = serverId;
    }

    li.appendChild(img);
    docServerList.appendChild(li);
}

function createServerList(selectedServerId) {
    docServerList.innerHTML = "";
    docLastServerEntry = null;
    docLastServerId = NoId;

    createServerEntry("./assets/imgs/dm.png", DMsId, `DMs`, selectedServerId == DMsId);

    let groups = getAllGroups();
    for (let i = 0; i < groups.length; i++)
        createServerEntry("./assets/imgs/uh.png", groups[i], `G: ${groups[i]}`, selectedServerId == groups[i]);

    for (let i = 0; i < 20; i++)
        createServerEntry("./assets/imgs/uh.png", i, `TEMP S: ${i}`, selectedServerId == i);
}


const docChannelList = document.getElementById("main-chat-selector-list");
let docLastChannelEntry = null;
let docLastChannelId = NoId;
let docLastChannelServerId = NoId;
// <li><span class="chat-selector-entry">CHAT 1</span></li>
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
    if (serverId == DMsId && channelId != NoId)
    {
        notCount = (await userGetUnreadMessages(channelId)).length;
    }

    let chanText = channelName;
    if (notCount > 0)
        chanText += ` (${notCount})`;

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
            await createChannelEntry(userIds[i], `User #${userIds[i]}`, serverId, selectedChatId == userIds[i]);
        if (userIds.length == 0)
            await createChannelEntry(NoId, "No Friends", serverId, false);
    }
    else
    {
        await createChannelEntry(0, "General", serverId, false);
        for (let i = 0; i < 40; i++)
            await createChannelEntry(i, `Channel ${i} S${serverId}`, serverId, selectedChatId == i);

    }
}

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

const docChatList = document.getElementById("main-chat-content-list");
const docChatUlDiv = document.getElementById("main-chat-content-uldiv");
let docChatLastServerId = NoId;
let docChatLastChannelId = NoId;
// <li><div class="chat-entry"><span class="chat-entry-username">Username</span> at <span>TIME</span><br><p class="chat-entry-message">Message yes es</p></div></li>
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
    let br = document.createElement("br");
    let p = document.createElement("p");
    p.className = "chat-entry-message";
    p.textContent = message;
    p.innerHTML = p.innerHTML.replaceAll("\n", "<br>");
    div.appendChild(span1);
    div.appendChild(document.createTextNode(" - "));
    div.appendChild(span2);
    div.appendChild(br);
    div.appendChild(p);
    li.appendChild(div);
    docChatList.appendChild(li);
}

async function createChatList(serverId, channelId, scrollDown) {
    docChatList.innerHTML = "";
    await updateChatInfo(serverId, channelId);

    let inputElement = document.getElementById('main-chat-content-input');
    if (serverId == NoId || channelId == NoId)
    {
        docChatList.textContent = "[No chat open]";
        inputElement.style.display = "none";
        return;
    }
    inputElement.style.display = "";

    if (serverId == DMsId)
    {
        let messages = await userGetMessages(channelId);
        if (messages == null)
            return;
        console.log(messages);

        for (let i = 0; i < messages.length; i++)
        {
            let msg = messages[i];
            createChatEntry(`User ${msg["from"]}`, msg["date"], msg["data"]);
        }
    }
    else
    {
        for (let i = 0; i < 30; i++)
            createChatEntry(`User ${i}`, "2024-04-27T17:43:03.164Z", `Test Message ${i} for chat ${channelId}`);
    }


    if (scrollDown)
    {
        docChatUlDiv.scrollTop = docChatUlDiv.scrollHeight;
    }
}

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
        docChatInfo.innerHTML = "[Group chat info not implemented yet]";
        return;
    }

    docChatInfo.innerHTML = "";

    {
        let div = document.createElement("div");
        let span = document.createElement("span");
        span.textContent = `User Info: ${channelId}`;
        div.appendChild(span);
        docChatInfo.appendChild(div);
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


async function serverClicked(element, serverId) {
    console.log(`Server ${serverId} clicked`);
    if (docLastServerEntry)
        docLastServerEntry.classList.remove("sidebar-entry-active");
    element.classList.add("sidebar-entry-active");
    docLastServerEntry = element;
    docLastServerId = serverId;

    if (serverId == docChatLastServerId)
        await createChannelList(serverId, docChatLastChannelId);
    else
        await createChannelList(serverId);

    if (settingsObj["chat"]["auto-show-chat"])
        setChannelInfoVisibility(true);
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

    docChatInputElement.focus();
}

function showId()
{
    let element = document.getElementById('main-chat-selector-settings-userid');
    element.textContent = `${currentUser["mainAccount"]["userId"]}`;
}





const rootElement = document.querySelector(':root');
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

function mainChatInputKey(event)
{
    let key = event.keyCode;
    let shift = event.shiftKey;
    if (key == 13 && !shift)
    {
        setTimeout(messageSend, 0);
        event.preventDefault();
    }
}

const docChatInputElement = document.getElementById("main-chat-content-input-input-textarea");
let messageSending = 0;
async function messageSend() {
    if (docChatLastServerId == NoId || docChatLastChannelId == NoId)
        return;

    if (messageSending > 0)
    {
        messageSending++;
        if (messageSending > 20) {
            messageSending = 0;
            console.log("SEND MAIL ANYWAY");
        }
        setTimeout(messageSend, 60);
        return;
    }
    messageSending++;

    let text = docChatInputElement.value;
    docChatInputElement.value = "";
    if (text == "")
    {
        messageSending = 0;
        return;
    }

    try {
        console.log(`Sending message: ${text}`);

        if (docChatLastServerId == DMsId)
        {
            let userId = docChatLastChannelId;
            let res = await userSendDirectMessage(userId, text, "text");
            console.log(res);
        }
        else
        {
            alert('Group chats not implemented yet');
        }
    }
    catch (e)
    {

    }

    await createChatList(docChatLastServerId, docChatLastChannelId, true);

    messageSending = 0;
}

async function addFriendUser()
{
    let userId = prompt("Enter user id:");
    if (userId == null)
        return;
    userId = parseInt(userId);
    if (isNaN(userId))
        return alert("Invalid user id");

    logInfo(`Adding user ${userId}`);

    let symmKey = await getUserMySymmKey(currentUser["mainAccount"], userId);
    if (symmKey == null)
    {
        alert("User does not exist!");
        return;
    }

    addUserIdIfNotExists(userId);

    if (docLastServerId == DMsId)
        await createChannelList(DMsId, docLastChannelId, docLastServerId, true);
}


async function doConnInit() {
    //tryExtFn(extMsgNormalMessage, account, chatUserId, message);
    extMsgNormalMessage = messageReceivedUI;


    showId();

    createServerList(DMsId);

    await createChannelList(DMsId);

    await createChatList(DMsId, NoId);
}

async function messageReceivedUI(account, chatUserId, message)
{
    if (chatUserId == docChatLastChannelId && docChatLastServerId == DMsId)
    {
        await userMarkMessagesAsRead(chatUserId);
        await createChatList(DMsId, chatUserId, true);
    }

    if (docLastServerId == DMsId)// && (await userGetMessages(chatUserId)).length == 1)
    {
        await createChannelList(DMsId, docLastChannelId, true);
    }
}