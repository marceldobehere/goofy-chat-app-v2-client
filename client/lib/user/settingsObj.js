let settingsObj = {};


function tryConformSettings(obj) {
    if (obj == undefined) obj = {};

    if (obj["chat"] == undefined) obj["chat"] = {};
    if (obj["chat"]["auto-show-chat"] == undefined) obj["chat"]["auto-show-chat"] = true;
    if (obj["chat"]["auto-hide-chat"] == undefined) obj["chat"]["auto-hide-chat"] = true;
    if (obj["chat"]["add-ping-reply"] == undefined) obj["chat"]["add-ping-reply"] = true;
    if (obj["chat"]["allow-external-sources-global"] == undefined) obj["chat"]["allow-external-sources-global"] = false;

    if (obj["notification"] == undefined) obj["notification"] = {};
    if (obj["notification"]["allow-notifications"] == undefined) obj["notification"]["allow-notifications"] = true;
    if (obj["notification"]["allow-push-notifications"] == undefined) obj["notification"]["allow-push-notifications"] = true;
    if (obj["notification"]["allow-sound"] == undefined) obj["notification"]["allow-sound"] = false;

    if (obj["goofy-console"] == undefined) obj["goofy-console"] = {};
    if (obj["goofy-console"]["enabled"] == undefined) obj["goofy-console"]["enabled"] = false;


    return obj;
}

function loadSettings() {
    let obj = _loadObject("main_settings");
    if (obj == undefined) obj = {};
    settingsObj = tryConformSettings(obj);
    saveSettings();
}

function saveSettings() {
    _saveObject("main_settings", settingsObj);
}

loadSettings();