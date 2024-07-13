async function exportProfile()
{
    let exportObj = {
        localStorage: localStorage,
        msgData: await internalMsgExportAll(currentUser['mainAccount'])
    }

    let data = JSON.stringify(exportObj);

    downloadTextFile(data, "profile.json");
}

async function resetProfile()
{
    if (!confirm("Are you sure?"))
        return;
    if (!confirm("Are you really sure?"))
        return;

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

    localStorage.clear();
    let ls = data["localStorage"];
    for (let key in ls)
        localStorage.setItem(key, ls[key]);

    let currUser = loadObject("currentUser");

    let msgData = data["msgData"];
    await internalResetAll();
    await internalMsgImportAll(currUser['mainAccount'], msgData);

    await initClientLib();

    await currUserFullImport(currUser, !loadBackup);

    location.reload();
}