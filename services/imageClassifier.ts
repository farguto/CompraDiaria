// Dictionary to translate common MobileNet (ImageNet) classes to Spanish
const TRANSLATIONS: Record<string, string> = {
  'banana': 'Banana',
  'apple': 'Manzana',
  'orange': 'Naranja',
  'broccoli': 'Brócoli',
  'carrot': 'Zanahoria',
  'cucumber': 'Pepino',
  'zucchini': 'Zucchini',
  'cabbage': 'Repollo',
  'cauliflower': 'Coliflor',
  'bell pepper': 'Pimiento',
  'lemon': 'Limón',
  'pineapple': 'Ananá',
  'strawberry': 'Frutilla',
  'mushroom': 'Hongo',
  'corn': 'Choclo',
  'carbonara': 'Pasta',
  'spaghetti': 'Espaguetis',
  'pizza': 'Pizza',
  'cheeseburger': 'Hamburguesa',
  'hot dog': 'Pancho',
  'burrito': 'Burrito',
  'espresso': 'Café',
  'cup': 'Taza',
  'coffee mug': 'Taza de café',
  'water bottle': 'Botella de agua',
  'wine bottle': 'Vino',
  'beer bottle': 'Cerveza',
  'pop bottle': 'Gaseosa',
  'milk can': 'Leche',
  'packet': 'Paquete',
  'bagel': 'Rosquilla',
  'bakery': 'Panadería',
  'toilet tissue': 'Papel higiénico',
  'paper towel': 'Rollo de cocina',
  'soap dispenser': 'Jabón',
  'lotion': 'Crema',
  'sunscreen': 'Protector solar',
  'pill bottle': 'Remedios',
  'remote control': 'Control remoto',
  'notebook': 'Cuaderno',
  'monitor': 'Monitor',
  'mouse': 'Mouse',
  'laptop': 'Notebook',
  'cellular telephone': 'Celular',
  'plate': 'Plato',
  'frying pan': 'Sartén',
  'toaster': 'Tostadora',
  'microwave': 'Microondas',
  'refrigerator': 'Heladera',
  'dishwasher': 'Lavavajillas',
  'washer': 'Lavarropas'
};

let model: any = null;

export async function loadModel() {
  if (model) return model;
  
  // Check if global mobilenet is available (loaded via script tag)
  if ((window as any).mobilenet) {
    console.log("Cargando modelo MobileNet...");
    model = await (window as any).mobilenet.load();
    console.log("Modelo cargado.");
    return model;
  } else {
    throw new Error("La librería MobileNet no está cargada.");
  }
}

export async function classifyImage(imageElement: HTMLImageElement): Promise<string | null> {
  if (!model) {
    await loadModel();
  }

  // Get predictions
  const predictions = await model.classify(imageElement);
  
  if (predictions && predictions.length > 0) {
    console.log("Predicciones:", predictions);
    // Get the top prediction
    const topClass = predictions[0].className.toLowerCase();
    
    // Try to find exact match first
    if (TRANSLATIONS[topClass]) {
      return TRANSLATIONS[topClass];
    }
    
    // Try to find partial match (e.g. "granny smith apple" -> "Manzana")
    for (const key in TRANSLATIONS) {
      if (topClass.includes(key)) {
        return TRANSLATIONS[key];
      }
    }

    // Fallback: Return original English name capitalized
    return topClass.charAt(0).toUpperCase() + topClass.slice(1);
  }

  return null;
}