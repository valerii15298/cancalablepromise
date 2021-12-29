import CancelablePromise from './cancelable-promise.js'

import  { describe, expect, test } from "@jest/globals"

describe('CancelablePromise test', () => {
  test('throws on wrong constructor arguments', () => {
    expect(() => new CancelablePromise()).toThrowError()
    expect(() => new CancelablePromise('wrong')).toThrowError()
  })

  test('create cancelable promise', () => {
    let isCompleted = false
    const promise = new CancelablePromise(() => isCompleted = true)
    expect(promise).toBeInstanceOf(CancelablePromise)
    expect(isCompleted).toBe(true)
  })

  test('resolving', async () => {
    const unique = Symbol()
    const promise = new CancelablePromise(resolve => setTimeout(() => resolve(unique)))
    await expect(promise).resolves.toBe(unique)
  })

  test('rejecting', async () => {
    const unique = Symbol()
    const promise = new CancelablePromise((resolve, reject) => setTimeout(() => reject(unique)))
    await expect(promise).rejects.toBe(unique)
  })

  describe('#then()', () => {
    test('throws on wrong argument', () => {
      const promise = new CancelablePromise(() => void 0)
      expect(() => promise.then('wrong')).toThrowError()
    })

    test('then(onFulfilled)', async () => {
      const initValue = 10
      const multiplier = 2
      const onFulfilled = value => value * multiplier

      const cp = new CancelablePromise(resolve => resolve(initValue))
      const cp2 = cp.then(v => {
        return new Promise(resolve => setTimeout(() => resolve(onFulfilled(v))))
      })


      expect(cp).not.toBe(cp2)
      expect(cp2).toBeInstanceOf(CancelablePromise)
      getPromiseState(cp2, state => expect(state).toBe('pending'))
      await expect(cp).resolves.toBe(initValue)
      await expect(cp2).resolves.toBe(onFulfilled(initValue))
    })

    test('then(onFulfilled, onRejected)', async () => {
      const initValue = 10
      const multiplier = 2
      const func = value => value * multiplier

      const cp = new CancelablePromise(resolve => resolve(initValue))
      const cp2 = cp.then(value => Promise.reject(value), func)

      expect(cp).not.toBe(cp2)
      expect(cp2).toBeInstanceOf(CancelablePromise)
      await expect(cp).resolves.toBe(initValue)
      await expect(cp2).resolves.toBe(func(initValue))
    })

    test('then() - empty arguments', async () => {
      const initValue = 10
      const cp = new CancelablePromise(resolve => resolve(initValue)).then()

      expect(cp).toBeInstanceOf(CancelablePromise)
      await expect(cp).resolves.toBe(initValue)
    })

    test('.then().then() ... .then()', async() => {
      const depth = 10
      let promise = new CancelablePromise(resolve => resolve(0))
      for(let idx = 0; idx < depth; ++idx) {
        promise = promise.then(val => val + 1)
      }

      expect(promise).toBeInstanceOf(CancelablePromise)
      await expect(promise).resolves.toBe(depth)
    })
  })

  describe('#cancel()', () => {
    test('should cancel promise', async () => {
      let value = 0
      const promise = new CancelablePromise(resolve => setTimeout(() => resolve(1), 100)).then(v => value = v)
      const promiseState = await getPromiseState(promise)

      expect(promiseState).toBe('pending')
      expect(typeof promise.cancel).toBe('function')

      setTimeout(() => promise.cancel())

      await expect(promise).rejects.toHaveProperty('isCanceled', true)
      expect(value).toBe(0)
    })
  })

  describe('#isCanceled', () => {
    test('should change state on cancel()', () => {
      const promise1 = new CancelablePromise(resolve => resolve(1))
      const promise2 = promise1.then(() => 2)

      expect(typeof promise1.isCanceled).toBe('boolean')
      expect(typeof promise2.isCanceled).toBe('boolean')
      expect(promise1.isCanceled).toBeFalsy()
      expect(promise2.isCanceled).toBeFalsy()

      promise2.cancel()

      expect(promise1.isCanceled).toBeTruthy()
      expect(promise2.isCanceled).toBeTruthy()

    })
  })
})




function getPromiseState(promise, callback) {
  const unique = Symbol('unique')
  return Promise.race([promise, Promise.resolve(unique)])
    .then(value => value === unique ? 'pending' : 'fulfilled')
    .catch(() => 'rejected')
    .then(state => {
      callback && callback(state)
      return state
  })
}