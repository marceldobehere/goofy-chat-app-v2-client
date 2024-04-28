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

const docServerList = document.getElementById("main-sidebar-list");
let docLastServerEntry = null;
// also sidebar-entry-active
// <li><img src="./assets/imgs/dm.png" class="sidebar-entry" onmouseover="serverHoverStart(this, 'A')" onmouseleave="serverHoverEnd()"></li>
function createServerEntry(imgSrc, serverId, serverName) {
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
    li.appendChild(img);
    docServerList.appendChild(li);
}

function createServerList() {
    docServerList.innerHTML = "";
    docLastServerEntry = null;

    createServerEntry("./assets/imgs/dm.png", -1, `DMs`);
    for (let i = 0; i < 20; i++)
        createServerEntry("./assets/imgs/uh.png", i, `S: ${i}`);
}


const docChannelList = document.getElementById("main-chat-selector-list");
let docLastChannelEntry = null;
// also chat-selector-entry-active
// <li><span class="chat-selector-entry">CHAT 1</span></li>
function createChannelEntry(channelId, channelName) {
    let li = document.createElement("li");
    let span = document.createElement("span");
    span.className = "chat-selector-entry";
    span.textContent = channelName;
    span.onclick = () => {
        channelClicked(span, channelId)
    };
    li.appendChild(span);
    docChannelList.appendChild(li);
}

function createChannelList(serverId) {
    docChannelList.innerHTML = "";
    docLastChannelEntry = null;

    createChannelEntry(0, "General");
    for (let i = 0; i < 40; i++)
        createChannelEntry(i, `Channel ${i}`);
}

const docChatList = document.getElementById("main-chat-content-list");
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
    time = localDate.toISOString().slice(0, 19).replace("T", " ");

    span2.textContent = time;
    let br = document.createElement("br");
    let p = document.createElement("p");
    p.className = "chat-entry-message";
    p.textContent = message;
    div.appendChild(span1);
    div.appendChild(document.createTextNode(" at "));
    div.appendChild(span2);
    div.appendChild(br);
    div.appendChild(p);
    li.appendChild(div);
    docChatList.appendChild(li);
}

function createChatList(channelId) {
    docChatList.innerHTML = "";

    for (let i = 0; i < 30; i++)
        createChatEntry(`User ${i}`, "2024-04-27T17:43:03.164Z", `Message ${i} for chat ${channelId}`);
}

function serverClicked(element, serverId) {
    console.log(`Server ${serverId} clicked`);
    if (docLastServerEntry)
        docLastServerEntry.classList.remove("sidebar-entry-active");
    element.classList.add("sidebar-entry-active");
    docLastServerEntry = element;

    createChannelList(serverId);
}

function channelClicked(element, channelId) {
    console.log(`Channel ${channelId} clicked`);
    if (docLastChannelEntry)
        docLastChannelEntry.classList.remove("chat-selector-entry-active");
    element.classList.add("chat-selector-entry-active");
    docLastChannelEntry = element;

    createChatList(channelId);
}

async function doConnInit() {
    createServerList();

    createChannelList(0);

    createChatList(0);
}

doConnInit().then();


function setChatInfoVisibility(visible)
{
    document.documentElement.style.setProperty("--main-chat-show-info", visible ? "1" : "0");
}

function toggleChatInfoVis()
{
    let visible = document.documentElement.style.getPropertyValue("--main-chat-show-info");
    setChatInfoVisibility(visible === "0");
}