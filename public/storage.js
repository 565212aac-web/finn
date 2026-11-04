// Photos stay in this browser. Blobs are never uploaded to the server.
window.momentStorage = (() => {
  let connection;
  function open() {
    return connection ||= new Promise((resolve,reject) => {
      const request = indexedDB.open('shiguang-moments',1);
      request.onupgradeneeded = () => request.result.createObjectStore('moments',{keyPath:'id'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(Error('Please close other Shiguang tabs and try again.'));
    }).catch(error => { connection=null; throw error; });
  }
  return {
    async list() {
      const db = await open();
      return new Promise((resolve,reject) => {
        const request = db.transaction('moments').objectStore('moments').getAll();
        request.onsuccess = () => resolve(request.result.sort((a,b)=>b.createdAt-a.createdAt).map(({blob,...photo})=>({...photo,src:blob?URL.createObjectURL(blob):photo.src})));
        request.onerror = () => reject(request.error);
      });
    },
    async add(photos) {
      const db = await open();
      return new Promise((resolve,reject) => {
        const tx = db.transaction('moments','readwrite');
        photos.forEach(photo => tx.objectStore('moments').add(photo));
        tx.oncomplete = () => resolve();
        tx.onabort = () => reject(tx.error || Error('Could not save photos'));
        tx.onerror = () => {}; // Abort reports the final outcome; no partial batch is committed.
      });
    }
  };
})();
