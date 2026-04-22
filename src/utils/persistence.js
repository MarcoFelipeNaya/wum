const DB_NAME = 'wum-db'
const DB_VERSION = 1
const STATE_STORE = 'appState'
const SNAPSHOT_STORE = 'autosaves'
const PRIMARY_STATE_KEY = 'primary'
const MAX_AUTOSAVE_SNAPSHOTS = 8

function openDb() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error || new Error('Could not open IndexedDB'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        const snapshotStore = db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'id' })
        snapshotStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

function runTransaction(storeName, mode, executor) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)

    let settled = false
    const finish = (fn) => (value) => {
      if (settled) return
      settled = true
      fn(value)
    }

    tx.oncomplete = () => finish(resolve)()
    tx.onerror = () => finish(reject)(tx.error || new Error('IndexedDB transaction failed'))
    tx.onabort = () => finish(reject)(tx.error || new Error('IndexedDB transaction aborted'))

    try {
      executor(store, tx, finish(resolve), finish(reject))
    } catch (error) {
      finish(reject)(error)
    }
  }))
}

export async function loadPrimaryState() {
  return runTransaction(STATE_STORE, 'readonly', (store, _tx, resolve, reject) => {
    const request = store.get(PRIMARY_STATE_KEY)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('Could not load saved universe'))
  })
}

export async function savePrimaryState(state, metadata = {}) {
  return runTransaction(STATE_STORE, 'readwrite', (store, _tx, resolve, reject) => {
    const request = store.put({
      key: PRIMARY_STATE_KEY,
      state,
      updatedAt: metadata.updatedAt || new Date().toISOString(),
      version: metadata.version ?? 1,
    })
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error || new Error('Could not save universe'))
  })
}

export async function createAutosaveSnapshot(snapshot) {
  return runTransaction(SNAPSHOT_STORE, 'readwrite', (store, tx, resolve, reject) => {
    const putRequest = store.put(snapshot)
    putRequest.onerror = () => reject(putRequest.error || new Error('Could not create autosave snapshot'))

    tx.oncomplete = () => resolve(true)
  })
}

export async function listAutosaveSnapshots() {
  const records = await runTransaction(SNAPSHOT_STORE, 'readonly', (store, _tx, resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error || new Error('Could not list autosaves'))
  })

  return records
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map(({ state, ...snapshot }) => snapshot)
}

export async function loadAutosaveSnapshot(id) {
  return runTransaction(SNAPSHOT_STORE, 'readonly', (store, _tx, resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error || new Error('Could not load autosave snapshot'))
  })
}

export async function trimAutosaveSnapshots(maxSnapshots = MAX_AUTOSAVE_SNAPSHOTS) {
  const snapshots = await runTransaction(SNAPSHOT_STORE, 'readonly', (store, _tx, resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error || new Error('Could not load autosaves for trimming'))
  })

  const staleSnapshots = snapshots
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(maxSnapshots)

  if (staleSnapshots.length === 0) return

  return runTransaction(SNAPSHOT_STORE, 'readwrite', (store, tx, resolve, reject) => {
    staleSnapshots.forEach((snapshot) => store.delete(snapshot.id))
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error || new Error('Could not trim autosaves'))
  })
}

export async function deleteAutosaveSnapshot(id) {
  return runTransaction(SNAPSHOT_STORE, 'readwrite', (store, _tx, resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error || new Error('Could not delete autosave snapshot'))
  })
}

export { MAX_AUTOSAVE_SNAPSHOTS }
