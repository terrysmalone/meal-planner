import './style.css'

type Category = 'Produce' | 'Protein' | 'Dairy' | 'Pantry'

type Ingredient = {
  name: string
  quantity: number
  unit: string
  category: Category
}

type Recipe = {
  id: string
  name: string
  description: string
  time: number
  servings: number
  tags: string[]
  ingredients: Ingredient[]
}

type PlannedRecipe = {
  recipeId: string
  servings: number
}

const recipes: Recipe[] = [
  {
    id: 'lemon-chicken',
    name: 'Lemon herb chicken',
    description: 'Roasted chicken with potatoes, greens, and a bright lemon dressing.',
    time: 40,
    servings: 4,
    tags: ['Weeknight', 'High protein'],
    ingredients: [
      { name: 'Chicken breasts', quantity: 4, unit: '', category: 'Protein' },
      { name: 'Baby potatoes', quantity: 700, unit: 'g', category: 'Produce' },
      { name: 'Green beans', quantity: 300, unit: 'g', category: 'Produce' },
      { name: 'Lemon', quantity: 2, unit: '', category: 'Produce' },
      { name: 'Olive oil', quantity: 3, unit: 'tbsp', category: 'Pantry' },
    ],
  },
  {
    id: 'tomato-pasta',
    name: 'Creamy tomato pasta',
    description: 'A comforting bowl of pasta with roasted tomatoes, basil, and parmesan.',
    time: 25,
    servings: 2,
    tags: ['Vegetarian', 'Quick'],
    ingredients: [
      { name: 'Penne pasta', quantity: 200, unit: 'g', category: 'Pantry' },
      { name: 'Cherry tomatoes', quantity: 300, unit: 'g', category: 'Produce' },
      { name: 'Garlic', quantity: 2, unit: 'cloves', category: 'Produce' },
      { name: 'Double cream', quantity: 150, unit: 'ml', category: 'Dairy' },
      { name: 'Parmesan', quantity: 50, unit: 'g', category: 'Dairy' },
      { name: 'Basil', quantity: 1, unit: 'bunch', category: 'Produce' },
    ],
  },
  {
    id: 'chickpea-curry',
    name: 'Coconut chickpea curry',
    description: 'A fragrant, pantry-friendly curry ready in one pot.',
    time: 35,
    servings: 4,
    tags: ['Vegan', 'One pot'],
    ingredients: [
      { name: 'Chickpeas', quantity: 2, unit: 'cans', category: 'Pantry' },
      { name: 'Coconut milk', quantity: 400, unit: 'ml', category: 'Pantry' },
      { name: 'Basmati rice', quantity: 300, unit: 'g', category: 'Pantry' },
      { name: 'Onion', quantity: 1, unit: '', category: 'Produce' },
      { name: 'Spinach', quantity: 150, unit: 'g', category: 'Produce' },
      { name: 'Curry powder', quantity: 2, unit: 'tbsp', category: 'Pantry' },
    ],
  },
  {
    id: 'salmon-bowl',
    name: 'Teriyaki salmon bowls',
    description: 'Flaky salmon with rice, crunchy vegetables, and a sticky glaze.',
    time: 30,
    servings: 2,
    tags: ['High protein', 'Fresh'],
    ingredients: [
      { name: 'Salmon fillets', quantity: 2, unit: '', category: 'Protein' },
      { name: 'Jasmine rice', quantity: 150, unit: 'g', category: 'Pantry' },
      { name: 'Cucumber', quantity: 1, unit: '', category: 'Produce' },
      { name: 'Carrots', quantity: 2, unit: '', category: 'Produce' },
      { name: 'Soy sauce', quantity: 3, unit: 'tbsp', category: 'Pantry' },
      { name: 'Sesame seeds', quantity: 1, unit: 'tbsp', category: 'Pantry' },
    ],
  },
]

const storageKey = 'meal-planner-plan'
const savedPlan = localStorage.getItem(storageKey)
let plannedRecipes: PlannedRecipe[] = savedPlan ? JSON.parse(savedPlan) : []
let activeView: 'plan' | 'recipes' = 'plan'

const app = document.querySelector<HTMLDivElement>('#app')!

const savePlan = () => localStorage.setItem(storageKey, JSON.stringify(plannedRecipes))

const formatQuantity = (quantity: number) =>
  Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1).replace('.0', '')

const getRecipe = (id: string) => recipes.find((recipe) => recipe.id === id)!

const renderRecipeCard = (recipe: Recipe) => {
  const plan = plannedRecipes.find((item) => item.recipeId === recipe.id)
  return `
    <article class="recipe-card ${plan ? 'is-selected' : ''}">
      <div class="recipe-card-top">
        <span class="recipe-icon">${recipe.name.charAt(0)}</span>
        <button class="select-button ${plan ? 'selected' : ''}" data-recipe="${recipe.id}">
          ${plan ? 'Added' : 'Add to week'}
        </button>
      </div>
      <div>
        <div class="eyebrow">${recipe.tags.join(' · ')}</div>
        <h3>${recipe.name}</h3>
        <p>${recipe.description}</p>
      </div>
      <div class="recipe-meta">
        <span>◷ ${recipe.time} min</span>
        <span>♧ ${recipe.servings} servings</span>
      </div>
    </article>
  `
}

const aggregateIngredients = () => {
  const grouped = new Map<Category, Map<string, { name: string; quantity: number; unit: string }>>()
  plannedRecipes.forEach(({ recipeId, servings }) => {
    const recipe = getRecipe(recipeId)
    recipe.ingredients.forEach((ingredient) => {
      const category = grouped.get(ingredient.category) ?? new Map()
      const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`
      const current = category.get(key)
      const scaled = ingredient.quantity * (servings / recipe.servings)
      category.set(key, {
        name: ingredient.name,
        quantity: (current?.quantity ?? 0) + scaled,
        unit: ingredient.unit,
      })
      grouped.set(ingredient.category, category)
    })
  })
  return grouped
}

const renderShoppingList = () => {
  const grouped = aggregateIngredients()
  if (!plannedRecipes.length) {
    return `<div class="empty-state"><span class="empty-icon">✦</span><h3>Your list is empty</h3><p>Add recipes to your week and your combined shopping list will appear here.</p></div>`
  }
  const categories: Category[] = ['Produce', 'Protein', 'Dairy', 'Pantry']
  return categories
    .filter((category) => grouped.has(category))
    .map(
      (category) => `
        <section class="shopping-group">
          <div class="shopping-heading"><h3>${category}</h3><span>${grouped.get(category)!.size} items</span></div>
          ${[...grouped.get(category)!.values()]
            .map(
              (item) => `
                <label class="shopping-item">
                  <input type="checkbox">
                  <span class="checkmark"></span>
                  <span>${item.name}</span>
                  <strong>${formatQuantity(item.quantity)} ${item.unit}</strong>
                </label>
              `,
            )
            .join('')}
        </section>
      `,
    )
    .join('')
}

const render = () => {
  const totalServings = plannedRecipes.reduce((total, item) => total + item.servings, 0)
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-mark">✦</span><span>Operation Fish for Life</span></a>
      <nav>
        <button class="${activeView === 'plan' ? 'active' : ''}" data-view="plan">Weekly plan</button>
        <button class="${activeView === 'recipes' ? 'active' : ''}" data-view="recipes">My recipes</button>
      </nav>
      <div class="topbar-actions"><button class="icon-button" aria-label="Search">⌕</button><button class="avatar">TM</button></div>
    </header>
    <main>
      <section class="hero">
        <div>
          <div class="eyebrow">WEEK OF OCTOBER 14–20</div>
          <h1>Give someone a fish and they'll eat for a day.<br><i>Teach them how to fish and they'll eat for life.</i></h1>
          <p>Choose your meals for the week and we’ll take care of the shopping list.</p>
        </div>
        <div class="week-summary"><span class="summary-label">THIS WEEK</span><strong>${plannedRecipes.length} <small>meals</small></strong><span>${totalServings} servings planned</span></div>
      </section>
      ${
        activeView === 'recipes'
          ? `<section class="section-header"><div><div class="eyebrow">YOUR COLLECTION</div><h2>Recipes to cook</h2></div><button class="outline-button">＋ New recipe</button></section>
             <section class="recipe-grid">${recipes.map(renderRecipeCard).join('')}</section>`
          : `<div class="content-grid">
              <section>
                <div class="section-header"><div><div class="eyebrow">STEP 1</div><h2>Pick your meals</h2></div><button class="text-button" data-view="recipes">See all recipes →</button></div>
                <div class="recipe-grid">${recipes.map(renderRecipeCard).join('')}</div>
              </section>
              <aside class="shopping-panel">
                <div class="panel-header"><div><div class="eyebrow">STEP 2</div><h2>Shopping list</h2></div><button class="print-button" onclick="window.print()">Print</button></div>
                <p class="panel-intro">Ingredients combined from your weekly plan.</p>
                ${renderShoppingList()}
              </aside>
            </div>`
      }
    </main>
    <footer><span>Operation Fish for Life</span><span>Everything saved locally on this device</span></footer>
  `
  bindEvents()
}

const bindEvents = () => {
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = button.dataset.view as 'plan' | 'recipes'
      render()
    })
  })
  document.querySelectorAll<HTMLButtonElement>('[data-recipe]').forEach((button) => {
    button.addEventListener('click', () => {
      const recipeId = button.dataset.recipe!
      const existing = plannedRecipes.find((item) => item.recipeId === recipeId)
      plannedRecipes = existing
        ? plannedRecipes.filter((item) => item.recipeId !== recipeId)
        : [...plannedRecipes, { recipeId, servings: getRecipe(recipeId).servings }]
      savePlan()
      render()
    })
  })
}

render()
