import { EnvironmentProviders } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { connectStorageEmulator, getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../../../environments/environment';

export const firebaseProviders: EnvironmentProviders[] = [
  provideFirebaseApp(() => initializeApp(environment.firebase)),
  provideAuth(() => {
    const auth = getAuth();
    if (environment.useEmulators) {
      connectAuthEmulator(auth, environment.emulators.authHost, { disableWarnings: true });
    }
    return auth;
  }),
  provideFirestore(() => {
    const firestore = getFirestore();
    if (environment.useEmulators) {
      connectFirestoreEmulator(firestore, environment.emulators.firestoreHost, environment.emulators.firestorePort);
    }
    return firestore;
  }),
  provideFunctions(() => {
    const fns = getFunctions();
    if (environment.useEmulators) {
      connectFunctionsEmulator(fns, environment.emulators.functionsHost, environment.emulators.functionsPort);
    }
    return fns;
  }),
  provideStorage(() => {
    const storage = getStorage();
    if (environment.useEmulators) {
      connectStorageEmulator(storage, environment.emulators.storageHost, environment.emulators.storagePort);
    }
    return storage;
  }),
];
