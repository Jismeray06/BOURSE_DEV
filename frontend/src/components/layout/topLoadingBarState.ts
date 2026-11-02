// Les actualisations automatiques (polling) ne doivent pas faire apparaître la barre de chargement.
// Les requêtes lancées de façon synchrone pendant `runSilently` sont ignorées par TopLoadingBar.
let silentDepth = 0;

export function runSilently(callback: () => void) {
  silentDepth += 1;
  try {
    callback();
  } finally {
    silentDepth -= 1;
  }
}

export const isSilent = () => silentDepth > 0;
