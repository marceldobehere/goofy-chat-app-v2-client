function hashString(str) {
    let hash = 0, i, chr;
    if (str === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }

    const adder = (1<<30)*4;
    if (hash < 0)
        hash += adder;

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