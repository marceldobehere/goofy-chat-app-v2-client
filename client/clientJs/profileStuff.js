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

    localStorage.clear();
    for (let key in data)
        localStorage.setItem(key, data[key]);

    location.reload();
}