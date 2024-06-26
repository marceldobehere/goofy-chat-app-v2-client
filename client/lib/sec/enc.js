function generateKeys ()
{
    let crypt = new JSEncrypt();
    crypt.getKey();
    return {"public": crypt.getPublicKey(), "private": crypt.getPrivateKey()};
};

function generateSymmKey()
{
    return CryptoJS.lib.WordArray.random(128/8).toString();
}

function testRsa(pubKey, privKey)
{
    let testStr1 = 'Hello, world!';

    let encrypt = new JSEncrypt();
    encrypt.setPublicKey(pubKey);
    let encrypted = encrypt.encrypt(testStr1);

    let decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privKey);
    let testStr2 = decrypt.decrypt(encrypted);

    if (testStr2 == testStr1)
        return true;

    logError('RSA CHECK FAILED!');
    return false;
}

function testAes(pubKey, privKey)
{
    let testStr1 = 'Hello, world!';

    let encrypted = CryptoJS.AES.encrypt('Hello, world!', privKey);

    let testStr2 = CryptoJS.AES.decrypt(encrypted, privKey).toString(CryptoJS.enc.Utf8);

    if (testStr1 == testStr2)
        return true;


    logError('AES CHECK FAILED!');
    return false;
}


let _encrypt = new JSEncrypt();
function encryptStr(str, publicKey)
{
    _encrypt.setPublicKey(publicKey);
    return _encrypt.encrypt(str);
}


let _decrypt = new JSEncrypt();
function decryptStr(str, privateKey)
{
    _decrypt.setPrivateKey(privateKey);
    return _decrypt.decrypt(str);
}


function StringIntoRsaStringList(str, pubKey)
{
    if (!pubKey)
    {
        logError(`Error: StringIntoRsaStringList() called with no public key!`);
        return [];
    }
    // we need to split the string into chunks of 100 bytes
    let rawStrList = [];
    let strLen = str.length;
    for (let i = 0; i < strLen; )
    {
        let chunk = str.substring(i, i + 100);
        rawStrList.push(chunk);
        i += 100;
    }

    let rsaStrList = [];
    for (let i = 0; i < rawStrList.length; i++)
    {
        let chunk = rawStrList[i];
        let rsaChunk = encryptStr(chunk, pubKey);
        rsaStrList.push(rsaChunk);
    }

    return rsaStrList;
}

function rsaStringListIntoString(rsaStrList, privKey)
{
    if (!privKey)
    {
        logError(`Error: rsaStringListIntoString() called with no private key!`);
        return "";
    }

    let str = "";
    for (let i = 0; i < rsaStrList.length; i++)
    {
        let rsaChunk = rsaStrList[i];
        let chunk = decryptStr(rsaChunk, privKey);
        str += chunk;
    }
    return str;
}

async function StringIntoRsaStringListAsync(str, pubKey)
{
    if (!pubKey)
    {
        logError(`Error: StringIntoRsaStringList() called with no public key!`);
        return [];
    }
    // we need to split the string into chunks of 100 bytes
    let rawStrList = [];
    let strLen = str.length;
    for (let i = 0; i < strLen; )
    {
        let chunk = str.substring(i, i + 100);
        rawStrList.push(chunk);
        i += 100;
    }

    let rsaStrList = [];
    for (let i = 0; i < rawStrList.length; i++)
    {
        let chunk = rawStrList[i];
        let rsaChunk = encryptStr(chunk, pubKey);
        rsaStrList.push(rsaChunk);
    }

    return rsaStrList;
}

async function rsaStringListIntoStringAsync(rsaStrList, privKey)
{
    if (!privKey)
    {
        logError(`Error: rsaStringListIntoString() called with no private key!`);
        return "";
    }

    let str = "";
    for (let i = 0; i < rsaStrList.length; i++)
    {
        let rsaChunk = rsaStrList[i];
        let chunk = decryptStr(rsaChunk, privKey);
        str += chunk;
    }
    return str;
}


let _sign = new JSEncrypt();
function createSignature(obj, privKey)
{
    _sign.setPrivateKey(privKey);
    return _sign.sign(JSON.stringify(obj), CryptoJS.SHA256, "sha256");
}


let _verify = new JSEncrypt();
function verifySignature(obj, signature, pubKey)
{
    _verify.setPublicKey(pubKey);
    return _verify.verify(JSON.stringify(obj), signature, CryptoJS.SHA256);
}

function accEncRsa(str, account)
{
    return encryptStr(str, account["public-key"]);
}

function accDecRsa(str, account)
{
    return decryptStr(str, account["private-key"]);
}

// function accSign(obj, account)
// {
//     return createSignature(obj, account["private-key"]);
// }
//
// function accVerify(obj, account)
// {
//     return verifySignature(obj, account["signature"], account["public-key"]);
// }

// function encAes(str, key)
// {
//     return CryptoJS.AES.encrypt(str, key).toString();
// }
//
// function decAes(str, key)
// {
//     return CryptoJS.AES.decrypt(str, key).toString(CryptoJS.enc.Utf8);
// }