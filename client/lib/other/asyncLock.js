class AsyncLock {
    constructor () {
        this.disable = () => {}
        this.promise = Promise.resolve()
    }

    enable () {
        this.promise = new Promise(resolve => this.disable = resolve)
    }
}
const lockIncoming = new AsyncLock();
const lockOutgoing = new AsyncLock();
const lockOutgoingAes = new AsyncLock();
const lockOutgoingRsa = new AsyncLock();
const lockSymmKey = new AsyncLock();

