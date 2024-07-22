let hashStringMap = new Map();

function hashString(str)
{
    let res = hashStringMap.get(str);
    if (res)
        return res;

    let hash = CryptoJS.PBKDF2(str, "GoofyHash123", {keySize: 16,iterations: 50000})["words"][0];

    if (hash < 0)
        hash *= -1;

    if (hashStringMap.size > 1_000)
        hashStringMap.clear();

    hashStringMap.set(str, hash);
    return hash;
}

function getRandomIntInclusive(min, max)
{
    min = Math.ceil(min);
    max = Math.floor(max);
    for (let i = Math.random() * 25; i >= 0; i--)
        Math.random();

    return Math.floor(Math.random() * (max - min + 1) + min);
}