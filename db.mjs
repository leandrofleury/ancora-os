const DATABASE = 'ancora-os-mvp';
const STORE = 'state';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function execute(mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(STORE, mode);
    const request = operation(txn.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    txn.oncomplete = () => db.close();
    txn.onerror = () => {db.close(); reject(txn.error);};
  });
}

export const loadState = () => execute('readonly', store => store.get('main'));
export const saveState = (state) => execute('readwrite', store => store.put(state, 'main'));
