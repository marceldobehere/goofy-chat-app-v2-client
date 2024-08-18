const settingsBgElement = document.getElementById("main-app-container-settings-bg");
const settingsElement = document.getElementById("main-app-container-settings");

const settingsMainInputAutoHideChatElement = document.getElementById("settings-main-input-auto-hide-chat");
const settingsMainInputAutoShowChatElement = document.getElementById("settings-main-input-auto-show-chat");
const settingsMainInputAllowExternalSourcesGlobalElement = document.getElementById("settings-main-input-allow-external-sources-global");
const settingsMainInputAddPingReply = document.getElementById("settings-main-input-add-ping-reply");
const settingsMainInputAllowNotifications = document.getElementById("settings-allow-notifications");
const settingsMainInputAllowNotificationSounds = document.getElementById("settings-allow-notification-sounds");
const settingsGoofyConsoleEnabled = document.getElementById("settings-goofy-console-enabled");

function hideSettings() {
    settingsBgElement.style.display = "none";
}

async function showSettings() {
    settingsMainInputAutoHideChatElement.checked = getSetting(["chat", "auto-hide-chat"]);
    settingsMainInputAutoShowChatElement.checked = getSetting(["chat", "auto-show-chat"]);
    settingsMainInputAllowExternalSourcesGlobalElement.checked = getSetting(["chat", "allow-external-sources-global"]);
    settingsMainInputAddPingReply.checked = getSetting(["chat", "add-ping-reply"]);
    settingsMainInputAllowNotifications.checked = getSetting(["notification", "allow-notifications"]);
    settingsMainInputAllowNotificationSounds.checked = getSetting(["notification", "allow-sound"]);
    settingsGoofyConsoleEnabled.checked = getSetting(["goofy-console", "enabled"]);

    checkNotifications().then();

    settingsBgElement.style.display = "block";
}


function setSetting(objPathArr, value) {
    let temp = settingsObj;
    for (let key of objPathArr.slice(0, objPathArr.length - 1))
        if (temp[key] == undefined)
            return alert("Invalid setting path: " + JSON.stringify(objPathArr));
        else
            temp = temp[key];

    temp[objPathArr[objPathArr.length - 1]] = value;
    saveSettings();
}

function getSetting(objPathArr) {
    let temp = settingsObj;
    for (let key of objPathArr)
        if (temp[key] == undefined)
            return null;
        else
            temp = temp[key];

    return temp;
}


async function settingsUiClicked() {
    if (docLastServerId == NoId)
        return;

    if (docLastServerId == DMsId) {
        alert("NO DM SETTINGS YET")
    } else {
        let choice = prompt("1 Add User\n2 Kick User\n3 Leave Group\n4 Add Channel\n5 Remove Channel");
        if (choice == null)
            return;

        choice = parseInt(choice);
        if (!(choice >= 1 && choice <= 5))
            return;

        if (choice == 1) {
            let userId = prompt("Enter user id:");
            if (userId == null)
                return;
            userId = parseInt(userId);
            if (isNaN(userId))
                return alert("Invalid user id");

            let symmKey = await getUserMySymmKey(currentUser["mainAccount"], userId);
            if (symmKey == null) {
                alert("User does not exist!");
                return;
            }

            try {
                let res = await addUserToGroup(currentUser, docLastServerId, userId);
                if (res !== true && res !== undefined)
                    alert(res);
            } catch (e) {
                alert(e);
            }
        } else if (choice == 2) {
            let userId = prompt("Enter user id:");
            if (userId == null)
                return;
            userId = parseInt(userId);
            if (isNaN(userId))
                return alert("Invalid user id");

            let symmKey = await getUserMySymmKey(currentUser["mainAccount"], userId);
            if (symmKey == null) {
                alert("User does not exist!");
                return;
            }

            try {
                let res = await removeUserFromGroup(currentUser, docLastServerId, userId);
                if (res !== true && res !== undefined)
                    alert(res);
            } catch (e) {
                alert(e);
            }
        } else if (choice == 3) {
            try {
                let res = await leaveGroup(currentUser, docLastServerId);
                if (res !== true && res !== undefined)
                    alert(res);
            } catch (e) {
                alert(e);
            }
        } else if (choice == 4) {
            let channelName = prompt("Enter new channel name:");
            if (channelName == "" || channelName == undefined)
                return;

            let res = await addChannelToGroup(currentUser, docLastServerId, channelName);
            if (res !== true && res !== undefined)
                alert(res);
        } else if (choice == 5) {
            let channelId = prompt("Enter channel id to delete:");
            if (channelId == null)
                return;
            channelId = parseInt(channelId);
            if (isNaN(channelId))
                return alert("Invalid channel id");

            let res = await removeChannelFromGroup(currentUser, docLastServerId, channelId);
            if (res !== true && res !== undefined)
                alert(res);
        }
    }
}