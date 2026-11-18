import { supabase } from './supabase'

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

export type ManualShoppingItem = {
  id: string
  name: string
  section: string
  quantity?: number
  unit?: string
}

export type WeeklyPlanItem = {
  recipeId: string
  servings: number
}

export type WeeklyPlan = {
  recipes: WeeklyPlanItem[]
  selectedShoppingItemIds: string[]
}

export type WeeklyPlanRecord = WeeklyPlan & {
  weekStart: string
}

const databaseName = 'operation-fish-for-life'
const databaseVersion = 16
const recipeStoreName = 'recipes'
const shoppingItemStoreName = 'shoppingItems'
const shoppingSectionStoreName = 'shoppingSections'
let activeHouseholdId: string | null = null

export const setActiveHousehold = (householdId: string | null) => {
  activeHouseholdId = householdId
}

const chickenFajitaTrayBake: Recipe = {
  id: 'loaded-chicken-fajita-tray-bake',
  name: 'One Tray Loaded Chicken & Fries Fajita Tray Bake',
  description: 'Loaded chicken, peppers, onions, and potatoes baked with fajita seasoning.',
  time: 40,
  servings: 2,
  tags: ['Gluten-free', 'One pot'],
  ingredients: [
    { name: 'Cheddar cheese', quantity: 60, unit: 'g', category: 'Dairy' },
    { name: 'Chicken breast strips', quantity: 375, unit: 'g', category: 'Protein' },
    { name: 'Dried chilli flakes', quantity: 0.75, unit: 'tsp', category: 'Pantry' },
    { name: 'Dried oregano', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Garlic clove', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Ground cumin', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Ground smoked paprika', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Mayonnaise', quantity: 37.5, unit: 'ml', category: 'Pantry' },
    { name: 'Red onion', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Red pepper', quantity: 2, unit: '', category: 'Produce' },
    { name: 'White potato', quantity: 6, unit: '', category: 'Produce' },
  ],
}

const chickenFajitaCremeFraicheTrayBake: Recipe = {
  id: 'chicken-fajita-creme-fraiche-tray-bake',
  name: 'Chicken Fajita Tray Bake With Crème Fraîche & Tomato Salsa',
  description: 'A fajita-style chicken tray bake with peppers, tortillas, crème fraîche, and tomato salsa.',
  time: 35,
  servings: 2,
  tags: ['Chicken', 'One pot', '30 min'],
  ingredients: [
    { name: 'Cayenne pepper', quantity: 0.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Cheddar cheese', quantity: 40, unit: 'g', category: 'Dairy' },
    { name: 'Chicken breast strips', quantity: 250, unit: 'g', category: 'Protein' },
    { name: 'Cumin', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Crème fraîche', quantity: 80, unit: 'g', category: 'Dairy' },
    { name: 'Garlic clove', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Ground coriander', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Ground cumin', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Ground smoked paprika', quantity: 2, unit: 'tsp', category: 'Pantry' },
    { name: 'Plain tortillas', quantity: 6, unit: '', category: 'Pantry' },
    { name: 'Red onion', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Spring onion', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Tomato', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Yellow pepper', quantity: 1, unit: '', category: 'Produce' },
  ],
}

const ovenBakedCheesyMushroomLentilLasagne: Recipe = {
  id: 'oven-baked-cheesy-mushroom-lentil-lasagne',
  name: 'Oven Baked Cheesy Mushroom & Lentil Lasagne',
  description: 'A cheesy vegetarian lasagne with mushrooms, lentils, and tomato sauce.',
  time: 45,
  servings: 2,
  tags: ['Vegetarian', 'One pot'],
  ingredients: [
    { name: 'Cheddar cheese', quantity: 80, unit: 'g', category: 'Dairy' },
    { name: 'Cornflour', quantity: 1, unit: 'tbsp', category: 'Pantry' },
    { name: 'Dried oregano', quantity: 1, unit: 'tbsp', category: 'Pantry' },
    { name: 'Finely chopped tomatoes', quantity: 200, unit: 'g', category: 'Produce' },
    { name: 'Garlic clove', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Lentils', quantity: 185, unit: 'g', category: 'Pantry' },
    { name: 'Lasagne sheets', quantity: 120, unit: 'g', category: 'Pantry' },
    { name: 'Red wine paste', quantity: 10, unit: 'g', category: 'Pantry' },
    { name: 'Vegetable stock mix', quantity: 5.5, unit: 'g', category: 'Pantry' },
    { name: 'Vegetable stock mix (intense)', quantity: 5.5, unit: 'g', category: 'Pantry' },
    { name: 'White cup mushrooms', quantity: 160, unit: 'g', category: 'Produce' },
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
    { name: 'Cherry tomatoes', quantity: 190, unit: 'g', category: 'Produce' },
    { name: 'Diced chorizo', quantity: 150, unit: 'g', category: 'Protein' },
    { name: 'Grated Italian hard cheese', quantity: 45, unit: 'g', category: 'Dairy' },
    { name: 'Roasted garlic paste', quantity: 22.5, unit: 'g', category: 'Pantry' },
    { name: 'Soft cheese', quantity: 75, unit: 'g', category: 'Dairy' },
    { name: 'Spaghetti', quantity: 285, unit: 'g', category: 'Pantry' },
    { name: 'Tenderstem broccoli', quantity: 120, unit: 'g', category: 'Produce' },
    { name: 'Tomato paste', quantity: 24, unit: 'g', category: 'Pantry' },
  ],
}

const cheesyMexicanRice: Recipe = {
  id: 'cheesy-mexican-style-rice',
  name: 'Cheesy Mexican-Style Rice With Crème Fraîche',
  description: 'Cheesy Mexican-style rice with black beans, peppers, tomatoes, and crème fraîche.',
  time: 15,
  servings: 2,
  tags: ['Vegetarian', 'Gluten-free', '10-minute meal'],
  ingredients: [
    { name: 'Black beans', quantity: 450, unit: 'g', category: 'Pantry' },
    { name: 'Chipotle paste', quantity: 75, unit: 'g', category: 'Pantry' },
    { name: 'Chives', quantity: 7.5, unit: 'g', category: 'Produce' },
    { name: 'Cooked white long grain rice', quantity: 420, unit: 'g', category: 'Pantry' },
    { name: 'Crème fraîche', quantity: 120, unit: 'g', category: 'Dairy' },
    { name: 'Finely chopped tomatoes', quantity: 300, unit: 'g', category: 'Produce' },
    { name: 'Ground cumin', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Ground smoked paprika', quantity: 3, unit: 'tsp', category: 'Pantry' },
    { name: 'Mozzarella', quantity: 187.5, unit: 'g', category: 'Dairy' },
    { name: 'Red pepper', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Roasted garlic paste', quantity: 22.5, unit: 'g', category: 'Pantry' },
    { name: 'Shallot', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Sriracha', quantity: 1.5, unit: 'tbsp', category: 'Pantry' },
    { name: 'Vegetable stock mix', quantity: 8.25, unit: 'g', category: 'Pantry' },
  ],
}

const hoisinChickenRice: Recipe = {
  id: 'hoisin-chicken-rice',
  name: 'Hoisin Chicken & Rice',
  description: 'Hoisin chicken with rice, sweet pea pods, mushrooms, and toasted sesame seeds.',
  time: 15,
  servings: 2,
  tags: ['Dairy-free', '10-minute meal'],
  ingredients: [
    { name: 'Cooked white long grain rice', quantity: 420, unit: 'g', category: 'Pantry' },
    { name: 'Cornflour', quantity: 1.5, unit: 'tbsp', category: 'Pantry' },
    { name: 'Diced chicken breast', quantity: 375, unit: 'g', category: 'Protein' },
    { name: 'Ginger & garlic paste', quantity: 22.5, unit: 'g', category: 'Pantry' },
    { name: 'Hoisin sauce', quantity: 60, unit: 'g', category: 'Pantry' },
    { name: 'Soy sauce', quantity: 22.5, unit: 'ml', category: 'Pantry' },
    { name: 'Sweet pea pods', quantity: 120, unit: 'g', category: 'Produce' },
    { name: 'Toasted sesame seeds', quantity: 7.5, unit: 'g', category: 'Pantry' },
    { name: 'White cup mushrooms', quantity: 240, unit: 'g', category: 'Produce' },
  ],
}

const beefMeatballsPotatoes: Recipe = {
  id: 'saucy-onion-gravy-beef-meatballs',
  name: 'Saucy Onion Gravy Beef Meatballs & Crushed Potatoes',
  description: 'Beef meatballs with onion gravy, crushed potatoes, and tenderstem broccoli.',
  time: 23,
  servings: 2,
  tags: ['Gluten-free', 'Dairy-free'],
  ingredients: [
    { name: 'Beef mince', quantity: 375, unit: 'g', category: 'Protein' },
    { name: 'Brown onion', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Cornflour', quantity: 1.5, unit: 'tbsp', category: 'Pantry' },
    { name: 'Garlic clove', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Gravy base', quantity: 21, unit: 'g', category: 'Pantry' },
    { name: 'Onion marmalade', quantity: 30, unit: 'g', category: 'Pantry' },
    { name: 'Tenderstem broccoli', quantity: 240, unit: 'g', category: 'Produce' },
    { name: 'Tomato paste', quantity: 24, unit: 'g', category: 'Pantry' },
    { name: 'White potato', quantity: 5, unit: '', category: 'Produce' },
  ],
}

const chickenButternutKorma: Recipe = {
  id: 'chicken-butternut-squash-korma',
  name: 'Chicken & Butternut Squash Korma With Rice And Naan',
  description: 'Mild chicken and butternut squash korma with rice, almonds, coriander, and mini garlic naans.',
  time: 20,
  servings: 2,
  tags: ['Dairy-free', '10-minute meal'],
  ingredients: [
    { name: 'Butternut squash cubes', quantity: 240, unit: 'g', category: 'Produce' },
    { name: 'Cooked white long grain rice', quantity: 420, unit: 'g', category: 'Pantry' },
    { name: 'Coriander', quantity: 7.5, unit: 'g', category: 'Produce' },
    { name: 'Curry powder', quantity: 0.75, unit: 'tbsp', category: 'Pantry' },
    { name: 'Diced chicken breast', quantity: 375, unit: 'g', category: 'Protein' },
    { name: 'Flaked almonds', quantity: 22.5, unit: 'g', category: 'Pantry' },
    { name: 'Mini garlic & coriander naans', quantity: 3, unit: '', category: 'Pantry' },
    { name: 'Solid creamed coconut', quantity: 37.5, unit: 'g', category: 'Pantry' },
  ],
}

const saagAlooPeas: Recipe = {
  id: 'saag-aloo-peas-pitta',
  name: 'Saag Aloo With Peas And Pitta',
  description: 'Plant-based saag aloo with peas, spinach, spiced potatoes, and wholemeal pittas.',
  time: 20,
  servings: 2,
  tags: ['Plant-based', 'Dairy-free', '10-minute meal'],
  ingredients: [
    { name: 'Blanched peas', quantity: 240, unit: 'g', category: 'Produce' },
    { name: 'Cumin seeds', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Curry powder', quantity: 0.75, unit: 'tbsp', category: 'Pantry' },
    { name: 'Ginger & garlic paste', quantity: 22.5, unit: 'g', category: 'Pantry' },
    { name: 'Ground turmeric', quantity: 0.75, unit: 'tsp', category: 'Pantry' },
    { name: 'Mango chutney', quantity: 30, unit: 'g', category: 'Pantry' },
    { name: 'Red chilli', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Solid creamed coconut', quantity: 37.5, unit: 'g', category: 'Pantry' },
    { name: 'Spinach', quantity: 180, unit: 'g', category: 'Produce' },
    { name: 'Toasted sesame seeds', quantity: 7.5, unit: 'g', category: 'Pantry' },
    { name: 'Tomato paste', quantity: 24, unit: 'g', category: 'Pantry' },
    { name: 'Vegetable stock mix', quantity: 8.25, unit: 'g', category: 'Pantry' },
    { name: 'Waxy potatoes', quantity: 525, unit: 'g', category: 'Produce' },
    { name: 'Wholemeal pittas', quantity: 3, unit: '', category: 'Pantry' },
  ],
}

const beefMushroomBolognese: Recipe = {
  id: 'beef-mushroom-bolognese',
  name: 'Beef & Mushroom Bolognese With Wholewheat Tortiglioni',
  description: 'Beef and mushroom bolognese with carrots, tomatoes, lighter cheese, and wholewheat tortiglioni.',
  time: 40,
  servings: 2,
  tags: ['30-minute meal'],
  ingredients: [
    { name: 'Beef mince', quantity: 187.5, unit: 'g', category: 'Protein' },
    { name: 'Beef stock mix (intense)', quantity: 8.25, unit: 'g', category: 'Pantry' },
    { name: 'Brown onion', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Carrot', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Chestnut mushrooms', quantity: 240, unit: 'g', category: 'Produce' },
    { name: 'Dried oregano', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Finely chopped tomatoes', quantity: 300, unit: 'g', category: 'Produce' },
    { name: 'Garlic clove', quantity: 3, unit: '', category: 'Produce' },
    { name: 'Lighter cheese', quantity: 45, unit: 'g', category: 'Dairy' },
    { name: 'Soy sauce', quantity: 12, unit: 'ml', category: 'Pantry' },
    { name: 'Wholewheat tortiglioni', quantity: 225, unit: 'g', category: 'Pantry' },
  ],
}

const batteredBasaChipsPeas: Recipe = {
  id: 'battered-basa-chips-mushy-peas',
  name: 'Battered Basa With Salt & Vinegar Chips And Mushy Peas',
  description: 'Battered basa with salt and vinegar chips, mushy peas, and a tangy mayonnaise sauce.',
  time: 40,
  servings: 2,
  tags: ['Dairy-free', '30-minute meal'],
  ingredients: [
    { name: 'Basa fillets', quantity: 3, unit: '', category: 'Protein' },
    { name: 'Blanched peas', quantity: 240, unit: 'g', category: 'Produce' },
    { name: 'Lemon', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Marmite', quantity: 12, unit: 'g', category: 'Pantry' },
    { name: 'Mayonnaise', quantity: 75, unit: 'ml', category: 'Pantry' },
    { name: 'Red wine vinegar', quantity: 45, unit: 'ml', category: 'Pantry' },
    { name: 'Shallot', quantity: 3, unit: '', category: 'Produce' },
    { name: 'Tomato ketchup', quantity: 45, unit: 'ml', category: 'Pantry' },
    { name: 'White potato', quantity: 5, unit: '', category: 'Produce' },
  ],
}

const herbyChickenLeekMash: Recipe = {
  id: 'herby-chicken-creamy-leek-mash',
  name: 'Herby Chicken With Creamy Leek Sauce And Buttery Mash',
  description: 'Herby chicken with creamy leek sauce, carrots, and buttery mashed potatoes.',
  time: 50,
  servings: 2,
  tags: ['40-minute meal'],
  ingredients: [
    { name: 'Carrot', quantity: 3, unit: '', category: 'Produce' },
    { name: 'Chicken breast portion', quantity: 3, unit: '', category: 'Protein' },
    { name: 'Chicken stock mix (intense)', quantity: 8.25, unit: 'g', category: 'Pantry' },
    { name: 'Crème fraîche', quantity: 120, unit: 'g', category: 'Dairy' },
    { name: 'Dijon mustard', quantity: 8.25, unit: 'g', category: 'Pantry' },
    { name: 'Dried thyme', quantity: 0.75, unit: 'tsp', category: 'Pantry' },
    { name: 'Garlic clove', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Leek', quantity: 2, unit: '', category: 'Produce' },
    { name: 'White potato', quantity: 6, unit: '', category: 'Produce' },
  ],
}

const cheesyBlackBeanEnchiladas: Recipe = {
  id: 'cheesy-black-bean-enchiladas',
  name: 'Cheesy Black Bean Enchiladas',
  description: 'Cheesy black bean enchiladas with spinach, red onion, and smoky spices.',
  time: 40,
  servings: 2,
  tags: ['Vegetarian', '30-minute meal'],
  ingredients: [
    { name: 'Black beans', quantity: 570, unit: 'g', category: 'Pantry' },
    { name: 'Cheddar cheese', quantity: 60, unit: 'g', category: 'Dairy' },
    { name: 'Garlic clove', quantity: 3, unit: '', category: 'Produce' },
    { name: 'Ground cumin', quantity: 1.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Ground smoked paprika', quantity: 3, unit: 'tsp', category: 'Pantry' },
    { name: 'Plain tortillas', quantity: 9, unit: '', category: 'Pantry' },
    { name: 'Red onion', quantity: 2, unit: '', category: 'Produce' },
    { name: 'Spinach', quantity: 120, unit: 'g', category: 'Produce' },
    { name: 'Tomato paste', quantity: 24, unit: 'g', category: 'Pantry' },
    { name: 'Vegetable stock mix (intense)', quantity: 8.25, unit: 'g', category: 'Pantry' },
  ],
}

const truffleCacioPepeRavioli: Recipe = {
  id: 'truffle-cacio-pepe-ravioli',
  name: 'Truffle Cacio E Pepe Sauce With Spinach & Ricotta Ravioli',
  description: 'Creamy truffle cacio e pepe sauce with spinach and ricotta ravioli, mushrooms, and Italian hard cheese.',
  time: 15,
  servings: 2,
  tags: ['Vegetarian', '10-minute meal'],
  ingredients: [
    { name: 'Cornish clotted cream', quantity: 60, unit: 'g', category: 'Dairy' },
    { name: 'Cracked black pepper', quantity: 3.75, unit: 'g', category: 'Pantry' },
    { name: 'Grated Italian hard cheese', quantity: 90, unit: 'g', category: 'Dairy' },
    { name: 'Spinach & ricotta ravioli', quantity: 375, unit: 'g', category: 'Pantry' },
    { name: 'Truffle flavour extra virgin olive oil', quantity: 12, unit: 'ml', category: 'Pantry' },
    { name: 'Vegetable stock mix', quantity: 8.25, unit: 'g', category: 'Pantry' },
    { name: 'White cup mushrooms', quantity: 240, unit: 'g', category: 'Produce' },
  ],
}

const smokyChickenMushroomSpaghetti: Recipe = {
  id: 'smoky-chicken-mushroom-spaghetti',
  name: 'Smoky Chicken & Mushroom Spaghetti',
  description: 'Smoky chicken and mushrooms with creamy mustard spaghetti.',
  time: 30,
  servings: 2,
  tags: ['Chicken', 'Pasta', '30 min'],
  ingredients: [
    { name: 'Chicken breast strips', quantity: 250, unit: 'g', category: 'Protein' },
    { name: 'Chicken stock', quantity: 1, unit: '', category: 'Pantry' },
    { name: 'Dijon mustard', quantity: 5.5, unit: 'g', category: 'Pantry' },
    { name: 'Dried chilli flakes', quantity: 0.5, unit: 'tsp', category: 'Pantry' },
    { name: 'Garlic clove', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Ground smoked paprika', quantity: 1, unit: 'tsp', category: 'Pantry' },
    { name: 'Onion', quantity: 1, unit: '', category: 'Produce' },
    { name: 'Parsley', quantity: 10, unit: 'g', category: 'Produce' },
    { name: 'Soft cheese', quantity: 80, unit: 'g', category: 'Dairy' },
    { name: 'White cup mushrooms', quantity: 80, unit: 'g', category: 'Produce' },
    { name: 'Wholewheat spaghetti', quantity: 190, unit: 'g', category: 'Pantry' },
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
      { name: 'Blanched peas', quantity: 240, unit: 'g', category: 'Produce' },
      { name: 'Cooked white long grain rice', quantity: 420, unit: 'g', category: 'Pantry' },
      { name: 'Garlic clove', quantity: 2, unit: '', category: 'Produce' },
      { name: 'Halloumi', quantity: 300, unit: 'g', category: 'Dairy' },
      { name: 'Mayonnaise', quantity: 75, unit: 'ml', category: 'Pantry' },
      { name: 'Peri peri spice mix', quantity: 1.5, unit: 'tbsp', category: 'Pantry' },
      { name: 'Red pepper', quantity: 2, unit: '', category: 'Produce' },
      { name: 'Sriracha or chilli sauce', quantity: 12, unit: 'ml', category: 'Pantry' },
    ],
  },
  chickenFajitaCremeFraicheTrayBake,
  ovenBakedCheesyMushroomLentilLasagne,
  chickenFajitaTrayBake,
  chorizoSpaghetti,
  cheesyMexicanRice,
  hoisinChickenRice,
  beefMeatballsPotatoes,
  chickenButternutKorma,
  saagAlooPeas,
  beefMushroomBolognese,
  batteredBasaChipsPeas,
  herbyChickenLeekMash,
  cheesyBlackBeanEnchiladas,
  truffleCacioPepeRavioli,
  smokyChickenMushroomSpaghetti,
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
      if (event.oldVersion < 16) {
        database.createObjectStore(shoppingItemStoreName, { keyPath: 'id' })
        database.createObjectStore(shoppingSectionStoreName, { keyPath: 'name' })
      }
      if (event.oldVersion < 2) request.transaction?.objectStore(recipeStoreName).put(chickenFajitaTrayBake)
      if (event.oldVersion < 3) request.transaction?.objectStore(recipeStoreName).put(chorizoSpaghetti)
      if (event.oldVersion < 4) {
        const store = request.transaction?.objectStore(recipeStoreName)
        const recipesRequest = store?.getAll()
        recipesRequest?.addEventListener('success', () => {
          if (store) {
            recipesRequest.result.forEach((recipe: Recipe) => {
              store.put({
                ...recipe,
                ingredients: recipe.ingredients.map((ingredient) => ({
                  ...ingredient,
                  quantity: ingredient.unit ? Math.round(ingredient.quantity * 1.5 * 100) / 100 : Math.round(ingredient.quantity * 1.5),
                })),
              })
            })
          }
          if (event.oldVersion < 5) request.transaction?.objectStore(recipeStoreName).put(cheesyMexicanRice)
          if (event.oldVersion < 6) request.transaction?.objectStore(recipeStoreName).put(hoisinChickenRice)
          if (event.oldVersion < 7) request.transaction?.objectStore(recipeStoreName).put(beefMeatballsPotatoes)
        })
      }
      if (event.oldVersion < 8) request.transaction?.objectStore(recipeStoreName).put(chickenButternutKorma)
      if (event.oldVersion < 9) request.transaction?.objectStore(recipeStoreName).put(saagAlooPeas)
      if (event.oldVersion < 10) request.transaction?.objectStore(recipeStoreName).put(beefMushroomBolognese)
      if (event.oldVersion < 11) request.transaction?.objectStore(recipeStoreName).put(batteredBasaChipsPeas)
      if (event.oldVersion < 12) request.transaction?.objectStore(recipeStoreName).put(herbyChickenLeekMash)
      if (event.oldVersion < 13) request.transaction?.objectStore(recipeStoreName).put(cheesyBlackBeanEnchiladas)
      if (event.oldVersion < 14) request.transaction?.objectStore(recipeStoreName).put(truffleCacioPepeRavioli)
      if (event.oldVersion < 15) {
        const store = request.transaction?.objectStore(recipeStoreName)
        const recipesRequest = store?.getAll()
        recipesRequest?.addEventListener('success', () => {
          recipesRequest.result.forEach((recipe: Recipe) => {
            store?.put({
              ...recipe,
              ingredients: recipe.ingredients.map((ingredient) => ({
                ...ingredient,
                quantity: ingredient.unit ? ingredient.quantity : Math.ceil(ingredient.quantity),
              })),
            })
          })
        })
      }
    }
  })
  return databasePromise
}

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('Recipe database request failed.'))
    request.onsuccess = () => resolve(request.result)
  })

const reportRemoteFailure = (operation: string, error: unknown) => {
  console.warn(`Supabase ${operation} failed; continuing with local storage.`, error)
}

const syncRemote = async (operation: () => PromiseLike<{ error: unknown | null }>, description: string) => {
  if (!activeHouseholdId) return
  try {
    const result = await operation()
    if (result.error) reportRemoteFailure(description, result.error)
  } catch (error) {
    reportRemoteFailure(description, error)
  }
}

const replaceLocalRecipes = async (recipes: Recipe[]) => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  const store = transaction.objectStore(recipeStoreName)
  store.clear()
  recipes.forEach((recipe) => store.put(recipe))
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to replace the local recipes.'))
    transaction.oncomplete = () => resolve()
  })
}

export const listRecipes = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readonly')
  const localRecipes = await requestResult(transaction.objectStore(recipeStoreName).getAll())
  if (!activeHouseholdId) return localRecipes.sort((first, second) => first.name.localeCompare(second.name))
  try {
    const { data, error } = await supabase.from('recipes').select('id, data').eq('household_id', activeHouseholdId)
    if (error) throw error
    const remoteRecipes = (data ?? []).map((row) => row.data as Recipe)
    if (!remoteRecipes.length) {
      await syncRemote(
        () =>
          supabase.from('recipes').upsert(
            localRecipes.map((recipe) => ({ household_id: activeHouseholdId, id: recipe.id, data: recipe })),
          ),
        'initial recipe sync',
      )
      return localRecipes.sort((first, second) => first.name.localeCompare(second.name))
    }
    await replaceLocalRecipes(remoteRecipes)
    return remoteRecipes.sort((first, second) => first.name.localeCompare(second.name))
  } catch (error) {
    reportRemoteFailure('recipe loading', error)
    return localRecipes.sort((first, second) => first.name.localeCompare(second.name))
  }
}

export const saveRecipe = async (recipe: Recipe) => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  transaction.objectStore(recipeStoreName).put(recipe)
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save the recipe.'))
    transaction.oncomplete = () => resolve()
  })
  await syncRemote(
    () => supabase.from('recipes').upsert({ household_id: activeHouseholdId, id: recipe.id, data: recipe }),
    'recipe save',
  )
}

export const deleteRecipe = async (id: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  transaction.objectStore(recipeStoreName).delete(id)
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to delete the recipe.'))
    transaction.oncomplete = () => resolve()
  })
  await syncRemote(
    () => supabase.from('recipes').delete().eq('household_id', activeHouseholdId).eq('id', id),
    'recipe deletion',
  )
}

export const replaceRecipes = async (recipes: Recipe[]) => {
  await replaceLocalRecipes(recipes)
  if (activeHouseholdId) {
    await syncRemote(
      async () => {
        const deleted = await supabase.from('recipes').delete().eq('household_id', activeHouseholdId)
        if (deleted.error) return deleted
        return supabase.from('recipes').upsert(recipes.map((recipe) => ({ household_id: activeHouseholdId, id: recipe.id, data: recipe })))
      },
      'recipe replacement',
    )
  }
}

export const listShoppingItems = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingItemStoreName, 'readonly')
  const localItems = await requestResult(transaction.objectStore(shoppingItemStoreName).getAll()) as ManualShoppingItem[]
  if (!activeHouseholdId) return localItems
  try {
    const { data, error } = await supabase.from('shopping_items').select('id, data').eq('household_id', activeHouseholdId)
    if (error) throw error
    const remoteItems = (data ?? []).map((row) => row.data as ManualShoppingItem)
    if (!remoteItems.length) {
      await syncRemote(
        () =>
          supabase.from('shopping_items').upsert(
            localItems.map((item) => ({ household_id: activeHouseholdId, id: item.id, data: item })),
          ),
        'initial shopping item sync',
      )
      return localItems
    }
    await replaceLocalShoppingItems(remoteItems)
    return remoteItems
  } catch (error) {
    reportRemoteFailure('shopping item loading', error)
    return localItems
  }
}

const replaceLocalShoppingItems = async (items: ManualShoppingItem[]) => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingItemStoreName, 'readwrite')
  const store = transaction.objectStore(shoppingItemStoreName)
  store.clear()
  items.forEach((item) => store.put(item))
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to replace the local shopping items.'))
    transaction.oncomplete = () => resolve()
  })
}

export const saveShoppingItem = async (item: ManualShoppingItem) => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingItemStoreName, 'readwrite')
  transaction.objectStore(shoppingItemStoreName).put(item)
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save the shopping item.'))
    transaction.oncomplete = () => resolve()
  })
  await syncRemote(
    () => supabase.from('shopping_items').upsert({ household_id: activeHouseholdId, id: item.id, data: item }),
    'shopping item save',
  )
}

export const deleteShoppingItem = async (id: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingItemStoreName, 'readwrite')
  transaction.objectStore(shoppingItemStoreName).delete(id)
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to delete the shopping item.'))
    transaction.oncomplete = () => resolve()
  })
  await syncRemote(
    () => supabase.from('shopping_items').delete().eq('household_id', activeHouseholdId).eq('id', id),
    'shopping item deletion',
  )
}

export const replaceShoppingItems = async (items: ManualShoppingItem[]) => {
  await replaceLocalShoppingItems(items)
  if (activeHouseholdId) {
    await syncRemote(
      async () => {
        const deleted = await supabase.from('shopping_items').delete().eq('household_id', activeHouseholdId)
        if (deleted.error) return deleted
        return supabase.from('shopping_items').upsert(items.map((item) => ({ household_id: activeHouseholdId, id: item.id, data: item })))
      },
      'shopping item replacement',
    )
  }
}

export const listShoppingSections = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingSectionStoreName, 'readonly')
  const localSections = await requestResult(transaction.objectStore(shoppingSectionStoreName).getAll()) as Array<{ name: string }>
  if (!activeHouseholdId) return localSections.map((section) => section.name)
  try {
    const { data, error } = await supabase.from('shopping_sections').select('name').eq('household_id', activeHouseholdId)
    if (error) throw error
    const remoteSections = (data ?? []).map((section) => section.name)
    if (!remoteSections.length) {
      await syncRemote(
        () =>
          supabase.from('shopping_sections').upsert(
            localSections.map((section) => ({ household_id: activeHouseholdId, name: section.name })),
          ),
        'initial shopping section sync',
      )
      return localSections.map((section) => section.name)
    }
    await replaceLocalShoppingSections(remoteSections)
    return remoteSections
  } catch (error) {
    reportRemoteFailure('shopping section loading', error)
    return localSections.map((section) => section.name)
  }
}

const replaceLocalShoppingSections = async (sections: string[]) => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingSectionStoreName, 'readwrite')
  const store = transaction.objectStore(shoppingSectionStoreName)
  store.clear()
  sections.forEach((name) => store.put({ name }))
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to replace the local shopping sections.'))
    transaction.oncomplete = () => resolve()
  })
}

export const saveShoppingSection = async (name: string) => {
  const database = await openDatabase()
  const transaction = database.transaction(shoppingSectionStoreName, 'readwrite')
  transaction.objectStore(shoppingSectionStoreName).put({ name })
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save the shopping section.'))
    transaction.oncomplete = () => resolve()
  })
  await syncRemote(
    () => supabase.from('shopping_sections').upsert({ household_id: activeHouseholdId, name }),
    'shopping section save',
  )
}

export const replaceShoppingSections = async (sections: string[]) => {
  await replaceLocalShoppingSections(sections)
  if (activeHouseholdId) {
    await syncRemote(
      async () => {
        const deleted = await supabase.from('shopping_sections').delete().eq('household_id', activeHouseholdId)
        if (deleted.error) return deleted
        return supabase.from('shopping_sections').upsert(sections.map((name) => ({ household_id: activeHouseholdId, name })))
      },
      'shopping section replacement',
    )
  }
}

export const loadWeeklyPlan = async (weekStart: string): Promise<WeeklyPlan | null> => {
  if (!activeHouseholdId) return null
  try {
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('data')
      .eq('household_id', activeHouseholdId)
      .eq('week_start', weekStart)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return parseWeeklyPlanData(data.data)
  } catch (error) {
    reportRemoteFailure('weekly plan loading', error)
    return null
  }
}

const parseWeeklyPlanData = (value: unknown): WeeklyPlan => {
  if (Array.isArray(value)) return { recipes: value as WeeklyPlanItem[], selectedShoppingItemIds: [] }
  if (!value || typeof value !== 'object') return { recipes: [], selectedShoppingItemIds: [] }
  const savedPlan = value as Partial<WeeklyPlan>
  return {
    recipes: Array.isArray(savedPlan.recipes) ? savedPlan.recipes : [],
    selectedShoppingItemIds: Array.isArray(savedPlan.selectedShoppingItemIds) ? savedPlan.selectedShoppingItemIds : [],
  }
}

export const listWeeklyPlans = async (): Promise<WeeklyPlanRecord[]> => {
  if (!activeHouseholdId) return []
  try {
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('week_start, data')
      .eq('household_id', activeHouseholdId)
      .order('week_start')
    if (error) throw error
    return (data ?? []).map((row) => ({ weekStart: row.week_start, ...parseWeeklyPlanData(row.data) }))
  } catch (error) {
    reportRemoteFailure('weekly plan listing', error)
    return []
  }
}

export const saveWeeklyPlan = async (weekStart: string, plan: WeeklyPlan) => {
  await syncRemote(
    () => supabase.from('weekly_plans').upsert({ household_id: activeHouseholdId, week_start: weekStart, data: plan }),
    'weekly plan save',
  )
}

export const replaceWeeklyPlans = async (plans: WeeklyPlanRecord[]) => {
  if (!activeHouseholdId) return
  await syncRemote(
    async () => {
      const deleted = await supabase.from('weekly_plans').delete().eq('household_id', activeHouseholdId)
      if (deleted.error) return deleted
      return supabase.from('weekly_plans').upsert(
        plans.map(({ weekStart, recipes, selectedShoppingItemIds }) => ({
          household_id: activeHouseholdId,
          week_start: weekStart,
          data: { recipes, selectedShoppingItemIds },
        })),
      )
    },
    'weekly plan replacement',
  )
}

export const initializeRecipes = async () => {
  const database = await openDatabase()
  const transaction = database.transaction(recipeStoreName, 'readwrite')
  const store = transaction.objectStore(recipeStoreName)
  ;['lemon-chicken', 'tomato-pasta', 'chickpea-curry', 'salmon-bowl'].forEach((id) => store.delete(id))
  const existingRecipes = await requestResult(store.getAll())
  const existingIds = new Set(existingRecipes.map((recipe) => recipe.id))
  starterRecipes.filter((recipe) => !existingIds.has(recipe.id)).forEach((recipe) => store.put(recipe))
  await new Promise<void>((resolve, reject) => {
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to initialize the recipe database.'))
    transaction.oncomplete = () => resolve()
  })
  return listRecipes()
}
