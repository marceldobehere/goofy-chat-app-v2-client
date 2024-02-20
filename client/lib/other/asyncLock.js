class AsyncLock {
    constructor () {
        this.promiseArr = [];
        this.resolveArr = [];
    }

    disable ()
    {
        if (this.resolveArr.length > 0)
        {
            console.log("Disabling lock");

            this.promiseArr.shift();
            this.resolveArr.shift()();
        }
        else
            alert("Invalid lock disable")
    }

    async enable ()
    {
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
}
const lockIncoming = new AsyncLock();
const lockOutgoing = new AsyncLock();
const lockOutgoingAes = new AsyncLock();
const lockOutgoingRsa = new AsyncLock();
const lockSymmKey = new AsyncLock();

