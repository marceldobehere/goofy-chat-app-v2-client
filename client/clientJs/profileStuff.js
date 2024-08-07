async function exportProfile()
{
    await lockIncoming.enable();
    await lockOutgoing.enable();

    let data;

    try {
        let exportObj = {
            localStorage: localStorage,
            msgData: await internalMsgExportAll(currentUser['mainAccount'])
        }

        data = JSON.stringify(exportObj);
    } catch (e) {
        logError(e);
    }

    lockIncoming.disable();
    lockOutgoing.disable();

    downloadTextFile(data, "profile.json");
}

async function resetProfile()
{
    if (!confirm("Are you sure?"))
        return;
    if (!confirm("Are you really sure?"))
        return;

    await lockIncoming.enable();
    await lockOutgoing.enable();

    await internalResetAll();
    localStorage.clear();
    location.reload();
}

async function importProfile()
{
    let data;
    try {
        data = await openFilePrompt();
    } catch (e) {
        alert("Error reading file");
        return;
    }
    if (!data)
        return;

    let loadBackup = false;
    if (confirm("Load as pure Backup?"))
        loadBackup = true;
    else if (confirm("Create new device user for this account?"))
        loadBackup = false;
    else
        return alert("Aborted");

    await lockIncoming.enable();
    await lockOutgoing.enable();

    localStorage.clear();
    let ls = data["localStorage"];
    for (let key in ls)
        localStorage.setItem(key, ls[key]);

    await internalResetAll();

    await initClientLib();

    let currUser = loadObject("currentUser");
    let msgData = data["msgData"];
    await internalMsgImportAll(currUser['mainAccount'], msgData);

    await currUserFullImport(currUser, !loadBackup);

    location.reload();
}