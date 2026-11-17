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
const databaseVersion = 1
const recipeStoreName = 'recipes'

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
]

let databasePromise: Promise<IDBDatabase> | undefined

const openDatabase = () => {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion)
    request.onerror = () => reject(request.error ?? new Error('Unable to open the recipe database.'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(recipeStoreName, { keyPath: 'id' })
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
