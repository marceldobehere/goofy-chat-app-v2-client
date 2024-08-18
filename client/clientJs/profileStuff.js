const exportFilesBtn = document.getElementById("settings-export-all-files-btn");
const importFilesBtn = document.getElementById("settings-import-all-files-btn");
const deleteFilesBtn = document.getElementById("settings-delete-all-files-btn");

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


    if (loadBackup)
    {
        await lockIncoming.enable();
        await lockOutgoing.enable();
    }

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

async function updateProfile()
{
    // 1. Change username
    // 2. idk

    let indexStr = prompt("Settings:\n1. Change Nickname");
    if (indexStr == null || indexStr == "")
        return;

    let index = parseInt(indexStr);
    if (isNaN(index))
        return alert("Invalid index");

    if (index < 1 || index > 1)
        return alert("Invalid index");

    if (index == 1)
    {
        let username = prompt("Enter new nickname:");
        if (username == null || username == "")
            return;

        let chatInfo = getOwnUserChatInfo(currentUser);
        chatInfo["baseNickname"] = username;

        await setOwnUserChatInfo(currentUser, chatInfo, false);
    }
}

async function exportAllFiles()
{
    exportFilesBtn.disabled = true;
    exportFilesBtn.textContent = "Exporting";

    try {
        let account = currentUser['mainAccount'];

        exportFilesBtn.textContent = "Getting files";
        let files = await internalGetAllRawFiles(account);
        let zip = new JSZip();
        let index = 0;
        for (let file of files)
        {
            index++;
            exportFilesBtn.textContent = `Exporting (${index}/${files.length})`;
            let fileId = file["fileId"];
            let userId = file["userId"];
            let accountUserId = file["accountUserId"];
            let info = file["info"];
            let chunks = file["chunks"];

            let newFileName = `FILE_${userId}_${fileId}`;

            // Metadata
            let metaData = {
                fileId: fileId,
                userId: userId,
                accountUserId: accountUserId,
                info: info
            };
            zip.file(`${newFileName}.meta`, JSON.stringify(metaData));

            // Actual data
            let yesFile = await internalGetFile(account, userId, fileId);
            if (!yesFile) {
                alert(`[Error: File not found]`);
                continue;
            }
            let fileData = yesFile["data"]; // is a uint8array
            let blob = new Blob([fileData]);

            zip.file(`${newFileName}.bin`, blob);
        }

        exportFilesBtn.textContent = "Generating ZIP";
        let content = await zip.generateAsync({type:"blob"});

        exportFilesBtn.textContent = "Downloading ZIP";
        downloadBlob(content, "files.zip");

        await sleep(500);
    } catch (e) {
        logError(e);
    }

    exportFilesBtn.disabled = false;
    exportFilesBtn.textContent = "Export Files";
}

async function splitOneBigArrayIntoArrayArrayWithChunkSize(arr, chunkSize)
{
    let res = [];
    let index = 0;
    while (index < arr.length)
    {
        let chunk = arr.slice(index, index + chunkSize);
        res.push(chunk);
        index += chunkSize;
    }
    return res;
}

async function importAllFiles()
{
    importFilesBtn.disabled = true;
    importFilesBtn.textContent = "Importing";

    try {
        let account = currentUser['mainAccount'];

        let data;
        try {
            data = await openBinaryFilePrompt();
        } catch (e) {
            alert("Error reading file");
            return;
        }
        if (!data)
            return;
        console.log("Got file: ", data);

        let zip = await JSZip.loadAsync(data);
        let files = [];
        zip.forEach((relativePath, zipEntry) => {
            files.push(zipEntry);
        });
        console.log("Got files: ", files);

        let tempFileMap = new Map();
        let index = 0;
        for (let zipEntry of files)
        {
            index++;
            importFilesBtn.textContent = `Importing (${index}/${files.length})`;

            let fileName = zipEntry.name;
            let preExt = fileName.split('.')[0];
            let ext = fileName.split('.')[1];
            if (!tempFileMap.has(preExt))
                tempFileMap.set(preExt, {meta: null, bin: null});
            let tempFile = tempFileMap.get(preExt);

            if (ext == "meta")
            {
                let metaStr = new TextDecoder().decode(await zipEntry.async("uint8array"));
                tempFile.meta = JSON.parse(metaStr);
            }
            else if (ext == "bin")
            {
                let binData = await zipEntry.async("uint8array");
                tempFile.bin = binData;
            }

            if (tempFile.meta && tempFile.bin)
            {
                try {
                    console.log(tempFile);
                    let fileId = tempFile.meta["fileId"];
                    let userId = tempFile.meta["userId"];
                    let info = tempFile.meta["info"];
                    let chunkSize = info["chunkSize"];
                    let chunkCount = info["chunkCount"];
                    let fileSize = info["fileSize"];
                    let filename = info["filename"];
                    let binChunks = await splitOneBigArrayIntoArrayArrayWithChunkSize(tempFile.bin, chunkSize);

                    let fileEntry = {
                        filename: filename,
                        fileSize: fileSize,
                        chunkSize: chunkSize,
                    };
                    await internalCreateFile(account, userId, fileId, fileEntry);
                    await internalUploadFileAllChunks(account, userId, fileId, binChunks);

                    // for (let chunkIndex = 0; chunkIndex < binChunks.length; chunkIndex++) {
                    //     let chunkData = binChunks[chunkIndex];
                    //     await internalUploadFile(account, userId, fileId, {chunkIndex: chunkIndex, chunkData: chunkData});
                    // }
                } catch (e) {
                    logError(e);
                }

                tempFileMap.delete(preExt);
            }
        }

        if (tempFileMap.size > 0)
            console.error("Some files were not imported: ", tempFileMap)

        console.log("Done importing");

    } catch (e) {
        logError(e);
    }

    await sleep(500);
    importFilesBtn.disabled = false;
    importFilesBtn.textContent = "Import Files";
}

async function clearAllFiles()
{
    if (!confirm("Are you sure?"))
        return;
    if (!confirm("Are you really sure?"))
        return;

    deleteFilesBtn.disabled = true;
    deleteFilesBtn.textContent = "Deleting";
    try {
        let account = currentUser['mainAccount'];
        let files = await internalGetAllRawFiles(account);
        let index = 0;
        for (let file of files)
        {
            index++;
            deleteFilesBtn.textContent = `Deleting (${index}/${files.length})`;
            let fileId = file["fileId"];
            let userId = file["userId"];
            await internalDeleteFile(account, userId, fileId);
        }
    } catch (e) {
        logError(e);
    }

    await sleep(500);
    deleteFilesBtn.disabled = false;
    deleteFilesBtn.textContent = "Delete All Files";
}