const logLock = false;

class AsyncLock {
    constructor () {
        this.promiseArr = [];
        this.resolveArr = [];
    }

    disable ()
    {
        if (this.resolveArr.length > 0)
        {
            if (logLock)
                console.log("Disabling lock");

            this.promiseArr.shift();
            this.resolveArr.shift()();
        }
        else
            alert("Invalid lock disable")
    }

    async enable ()
    {
        if (logLock)
            console.log("Enabling lock");

        let tempPromises = [];
        for (let prom of this.promiseArr)
            tempPromises.push(prom);
        let bigPromise = Promise.all(tempPromises);

        let resolve;
        let promise = new Promise(r => resolve = r);
        this.promiseArr.push(promise);
        this.resolveArr.push(resolve);

        await bigPromise;
    }

    async tryEnable ()
    {
        if (logLock)
            console.log("Trying to enable lock");

        if (this.resolveArr.length > 0)
            return false;

        await this.enable();
        return true;
    }
}
const lockIncoming = new AsyncLock();
const lockOutgoing = new AsyncLock();
const lockOutgoingAes = new AsyncLock();
const lockOutgoingRsa = new AsyncLock();
const lockSymmKey = new AsyncLock();

const locklocalMsg = new AsyncLock();
