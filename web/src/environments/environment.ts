// Configurazione per sviluppo locale contro Firebase Emulator Suite (nessun
// progetto reale, nessuna credenziale vera — vedi .firebaserc: "demo-mensa").
// apiKey/appId sono placeholder: l'emulatore non li valida.
export const environment = {
  production: false,
  useEmulators: true,
  firebase: {
    projectId: 'demo-mensa',
    apiKey: 'demo-api-key',
    authDomain: 'demo-mensa.firebaseapp.com',
    appId: '1:0:web:0',
  },
  emulators: {
    authHost: 'http://localhost:9099',
    firestoreHost: 'localhost',
    firestorePort: 8080,
    functionsHost: 'localhost',
    functionsPort: 5001,
    storageHost: 'localhost',
    storagePort: 9199,
  },
};
