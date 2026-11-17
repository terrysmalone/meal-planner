export type Category = 'Produce' | 'Protein' | 'Dairy' | 'Pantry'

export type Ingredient = {
  name: string
  quantity: number
  unit: string
  category: Category
}

export type Recipe = {
  id: string
  name: string
  description: string
  time: number
  servings: number
  tags: string[]
  ingredients: Ingredient[]
}

const databaseName = 'operation-fish-for-life'
const databaseVersion = 3
const recipeStoreName = 'recipes'

const chickenFajitaTrayBake: Recipe = {
  id: 'loaded-chicken-fajita-tray-bake',
  name: 'One Tray Loaded Chicken & Fries Fajita Tray Bake',
  description: 'Loaded chicken, peppers, onions, and potatoes baked with fajita seasoning.',
  time: 40,
  servings: 2,
  tags: ['Gluten-free', 'One pot'],
  ingredients: [
    { name: 'Cheddar cheese', quantity: 40, unit: 'g', category: 'Dairy' },
    { name: 'Chicken breast strips', quantity: 250, unit: 'g', category: 'Protein' },
    { name: 'Dried chilli flakes', quantity: 0.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Dried oregano', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Garlic clove', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Ground cumin', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Ground smoked paprika', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Mayonnaise', quantity: 25, unit: 'ml', category: 'Pantry' },
    { name: 'Red onion', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Red pepper', quantity: 1, unit: '', category: 'Produce' },
    { name: 'White potato', quantity: 4, unit: '', category: 'Produce' },
  ],
}

const chorizoSpaghetti: Recipe = {
  id: 'chorizo-tomato-tenderstem-spaghetti',
  name: 'Chorizo, Tomato & Tenderstem Spaghetti',
  description: 'Chorizo spaghetti with cherry tomatoes, soft cheese, and tenderstem broccoli.',
  time: 15,
  servings: 2,
  tags: ['10-minute meal'],
  ingredients: [
    { name: 'Cherry tomatoes', quantity: 125, unit: 'g', category: 'Produce' },
    { name: 'Diced chorizo', quantity: 100, unit: 'g', category: 'Protein' },
    { name: 'Grated Italian hard cheese', quantity: 30, unit: 'g', category: 'Dairy' },
    { name: 'Roasted garlic paste', quantity: 15, unit: 'g', category: 'Pantry' },
    { name: 'Soft cheese', quantity: 50, unit: 'g', category: 'Dairy' },
    { name: 'Spaghetti', quantity: 190, unit: 'g', category: 'Pantry' },
    { name: 'Tenderstem broccoli', quantity: 80, unit: 'g', category: 'Produce' },
    { name: 'Tomato paste', quantity: 16, unit: 'g', category: 'Pantry' },
  ],
}

export const starterRecipes: Recipe[] = [
  {
    id: 'peri-peri-halloumi-rice',
    name: 'Peri Peri Fried Rice With Halloumi & Chilli Mayo',
    description: 'Peri peri fried rice with golden halloumi and chilli mayo.',
    time: 20,
    servings: 2,
    tags: ['Vegetarian', 'Quick'],
    ingredients: [
      { name: 'Blanched peas', quantity: 160, unit: 'g', category: 'Produce' },
      { name: 'Cooked white long grain rice', quantity: 280, unit: 'g', category: 'Pantry' },
      { name: 'Garlic clove', quantity: 1, unit: '', category: 'Produce' },
      { name: 'Halloumi', quantity: 200, unit: 'g', category: 'Dairy' },
      { name: 'Mayonnaise', quantity: 50, unit: 'ml', category: 'Pantry' },
      { name: 'Peri peri spice mix', quantity: 1, unit: 'tbsp', category: 'Pantry' },
      { name: 'Red pepper', quantity: 1, unit: '', category: 'Produce' },
      { name: 'Sriracha or chilli sauce', quantity: 8, unit: 'ml', category: 'Pantry' },
    ],
  },
  chickenFajitaTrayBake,
  chorizoSpaghetti,
]

let databasePromise: Promise<IDBDatabase> | undefined

const openDatabase = () => {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onerror = () => reject(request.error ?? new Error('Unable to open the recipe database.'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const database = request.result
      if (event.oldVersion < 1) database.createObjectStore(recipeStoreName, { keyPath: 'id' })
      if (event.oldVersion < 2) request.transaction?.objectStore(recipeStoreName).put(chickenFajitaTrayBake)
      if (event.oldVersion < 3) request.transaction?.objectStore(recipeStoreName).put(chorizoSpaghetti)
    }
  })
  return databasePromise
}

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('Recipe database request failed.'))
    request.onsuccess = () => resolve(request.result)
  })

export const listRecipes = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readonly')
  const recipes = await requestResult(transaction.objectStore(recipeStoreName).getAll())
  return recipes.sort((first, second) => first.name.localeCompare(second.name))
}

export const saveRecipe = async (recipe: Recipe) => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  transaction.objectStore(recipeStoreName).put(recipe)
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save the recipe.'))
    transaction.oncomplete = () => resolve()
  })
}

export const deleteRecipe = async (id: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  transaction.objectStore(recipeStoreName).delete(id)
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to delete the recipe.'))
    transaction.oncomplete = () => resolve()
  })
}

export const initializeRecipes = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  const store = transaction.objectStore(recipeStoreName)
  ;['lemon-chicken', 'tomato-pasta', 'chickpea-curry', 'salmon-bowl'].forEach((id) => store.delete(id))
  const count = await requestResult(store.count())
  if (count === 0) starterRecipes.forEach((recipe) => store.put(recipe))
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to initialize the recipe database.'))
    transaction.oncomplete = () => resolve()
  })
  return listRecipes()
}
