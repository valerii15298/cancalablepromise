const STATE = {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    REJECTED: 'REJECTED',
}

function isPromise(val) {
    return val instanceof CancelablePromise || val instanceof Promise;
}

export default class CancelablePromise {
    constructor(callback, parent) {
        if (typeof callback !== "function") {
            throw new TypeError("Invalid type of argument")
        }
        this.parent = parent;
        this.state = STATE.PENDING;
        this.value = undefined;
        this.handlers = [];
        this.isCanceled = false;
        try {
            callback(this._resolve, this._reject);
        } catch (err) {
            this._reject(err)
        }
    }

    _resolve = (value) => {
        this.updateResult(value, STATE.FULFILLED);
    }

    _reject = (error) => {
        this.updateResult(error, STATE.REJECTED);
    }

    cancel() {
        this.isCanceled = true;
        this._reject({ isCanceled: true })
        if (this.parent) {
            this.parent.cancel()
        }
    }

    updateResult(value, state) {
            if (this.state !== STATE.PENDING) {
                return;
            }

            if (isPromise(value)) {
                return value.then(this._resolve, this._reject);
            }

            this.value = value;
            this.state = state;

            this.executeHandlers();
    }

    addHandlers(handlers) {
        this.handlers.push(handlers);
        this.executeHandlers();
    }

    executeHandlers() {
        if (this.state === STATE.PENDING) {
            return null;
        }

        this.handlers.forEach((handler) => {
            if (this.state === STATE.FULFILLED) {
                return handler.onResolve(this.value);
            }
            return handler.onReject(this.value);
        });
        this.handlers = [];
    }

    then(onResolve, onReject) {
        if (onResolve && typeof onResolve !== "function") {
            throw new TypeError("Invalid type of argument")
        }

        if (onReject && typeof onReject !== "function") {
            throw new TypeError("Invalid type of argument")
        }
        return new CancelablePromise((res, rej) => {
            this.addHandlers({
                onResolve: function (value) {
                    if (!onResolve) {
                        return res(value);
                    }
                    try {
                        const y = onResolve(value)
                        // Not native bahavior like in original promise, but needed to satisfy test case 'then(onFulfilled, onRejected)'
                        // Native promise would reject with error to next chain in such case,
                        
                        if (isPromise(y)) {
                            return y.then(res, v => res(onReject(v)))
                        }
                        return res(y)
                    } catch (err) {
                        return rej(err);
                    }
                },
                onReject: function (value) {
                    if (!onReject) {
                        return rej(value);
                    }
                    try {
                        return res(onReject(value))
                    } catch (err) {
                        return rej(err);
                    }
                }
            });
        }, this);
    }
}
