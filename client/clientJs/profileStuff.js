function exportProfile()
{
    let data = JSON.stringify(localStorage);

    downloadTextFile(data, "profile.json");
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
    for (let key in data)
        localStorage.setItem(key, data[key]);

    await initClientLib();

    await currUserFullImport(loadObject("currentUser"), !loadBackup);

    location.reload();
}