function clearAllLocalStorage()
{
    localStorage.clear();
}

function loadObjectOrCreateDefault(key, defaultObj)
{
    let temp = localStorage.getItem(key);
    if (temp == null)
    {
        saveObject(key, defaultObj);
        return defaultObj;
    }

    return JSON.parse(temp);
}

function loadObject(key)
{
    let temp = localStorage.getItem(key);
    if (temp == null)
        return null;

    return JSON.parse(temp);
}

function saveObject(key, obj)
{
    localStorage.setItem(key, JSON.stringify(obj));
}

function aesEncrypt(dec)
{
    return CryptoJS.AES.encrypt(dec, ENV_CLIENT_PRIVATE_KEY).toString();
}

function aesDecrypt(enc)
{
    return CryptoJS.AES.decrypt(enc, ENV_CLIENT_PRIVATE_KEY).toString(CryptoJS.enc.Utf8);
}

function loadAesEncryptedObject(key)
{
    let temp = localStorage.getItem(key);
    if (temp == null)
        return null;

    temp = aesDecrypt(temp, ENV_CLIENT_PRIVATE_KEY);
    return JSON.parse(temp);
}

function saveAesEncryptedObject(key, obj)
{
    let temp = JSON.stringify(obj);
    temp = aesEncrypt(temp);

    localStorage.setItem(key, temp);
}