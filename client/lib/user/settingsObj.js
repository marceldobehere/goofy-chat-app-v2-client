let settingsObj = {};

function tryConformSettings(obj)
{
    if (obj == undefined) obj = {};
    if (obj["chat"] == undefined) obj["chat"] = {};
    if (obj["chat"]["auto-show-chat"] == undefined) obj["chat"]["auto-show-chat"] = true;
    if (obj["chat"]["auto-hide-chat"] == undefined) obj["chat"]["auto-hide-chat"] = true;


    return obj;
}

function loadSettings()
{
    let obj = _loadObject("main_settings");
    if (obj == undefined) obj = {};
    settingsObj = tryConformSettings(obj);
    saveSettings();
}
function saveSettings()
{
    _saveObject("main_settings", settingsObj);
}

loadSettings();