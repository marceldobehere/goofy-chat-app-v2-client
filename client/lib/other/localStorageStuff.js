function clearAllLocalStorage()
{
    localStorage.clear();
}

function resetWithPassword(password)
{
    clearAllLocalStorage();
    _saveObject("isPasswordSecured", true);
    let hash = hashString(password);
    _saveObject("securedPasswordHash", hash);
}

function resetWithoutPassword(password)
{
    clearAllLocalStorage();
    _saveObject("isPasswordSecured", false);
}


let isPasswordSecured = false;
let securedPasswordHash = 0;
let securedPasswordKey = "";

async function initLocalStorageStuff(askPasswordCallback, passwordInvalidCallback, askIfPasswordWanted)
{
    isPasswordSecured = _loadObject("isPasswordSecured");
    if (isPasswordSecured == null)
    {
        isPasswordSecured = await askIfPasswordWanted();
        _saveObject("isPasswordSecured", isPasswordSecured);

        if (isPasswordSecured)
        {
            let password = await askPasswordCallback();
            let hash = hashString(password);
            _saveObject("securedPasswordHash", hash);
        }
    }

    securedPasswordHash = _loadObject("securedPasswordHash");
    if (isPasswordSecured)
    {
        while (true)
        {
            let password = await askPasswordCallback();
            let hash = hashString(password);
            if (hash === securedPasswordHash)
            {
                securedPasswordKey = password;
                break;
            }
            else
                await passwordInvalidCallback();
        }
    }
}

function _loadObject(key)
{
    let temp = localStorage.getItem(key);
    if (temp == null)
        return null;

    return JSON.parse(temp);
}

function _saveObject(key, obj)
{
    localStorage.setItem(key, JSON.stringify(obj));
}

function _loadObjectOrCreateDefault(key, defaultObj)
{
    let temp = _loadObject(key);
    if (temp == null)
    {
        _saveObject(key, defaultObj);
        return defaultObj;
    }

    return temp;
}

function loadObject(key)
{
    if (!isPasswordSecured)
        return _loadObject(key);
    // console.log(`> LOAD OBJECT: ${key} (1/2)`);
    // key = aesEncrypt(key, securedPasswordKey);
    // console.log(`> LOAD OBJECT: ${key} (2/2)`);

    let temp = _loadObject(key);
    if (temp == null)
        return null;
    let res = aesDecrypt(temp, securedPasswordKey);
    return JSON.parse(res);
}

function saveObject(key, obj)
{
    if (!isPasswordSecured)
        return _saveObject(key, obj);
    // console.log(`> SAVING OBJECT: ${key} (1/2)`);
    // key = aesEncrypt(key, securedPasswordKey);
    // console.log(`> SAVING OBJECT: ${key} (2/2)`);

    let temp = JSON.stringify(obj);
    temp = aesEncrypt(temp, securedPasswordKey);
    _saveObject(key, temp);
}

function loadObjectOrCreateDefault(key, defaultObj)
{
    let temp = loadObject(key);
    if (temp == null)
    {
        saveObject(key, defaultObj);
        return defaultObj;
    }

    return temp;
}

function loadAccountObjectOrCreateDefault(account, key, defaultObj)
{
    return loadObjectOrCreateDefault(`ACC_${account["userId"]}_${key}`, defaultObj);
}

function loadAccountObject(account, key)
{
    return loadObject(`ACC_${account["userId"]}_${key}`);
}

function saveAccountObject(account, key, obj)
{
    saveObject(`ACC_${account["userId"]}_${key}`, obj);
}






function aesEncrypt(dec, key)
{
    console.log(`> AES ENCRYPT:`);
    console.log(dec)
    return CryptoJS.AES.encrypt(JSON.stringify(dec), key).toString();
}

function aesDecrypt(enc, key)
{
    console.log(`> AES DECRYPT:`);
    console.log(enc);
    return JSON.parse(CryptoJS.AES.decrypt(enc, key).toString(CryptoJS.enc.Utf8));
}

// function loadAesEncryptedObject(key, _key)
// {
//     let temp = loadObject(key);
//     if (temp == null)
//         return null;
//
//     temp = aesDecrypt(temp, _key);
//     return JSON.parse(temp);
// }
//
// function saveAesEncryptedObject(key, obj, _key)
// {
//     let temp = JSON.stringify(obj);
//     temp = aesEncrypt(temp, _key);
//
//     saveObject(key, temp);
// }