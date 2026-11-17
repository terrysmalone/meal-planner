import { createWorker } from 'tesseract.js'
import './style.css'
import { initializeRecipes, listRecipes, saveRecipe } from './recipe-store'
import type { Category, Ingredient, Recipe } from './recipe-store'

type PlannedRecipe = {
  recipeId: string
  servings: number
}

const storageKey = 'meal-planner-plan'
const savedPlan = localStorage.getItem(storageKey)
let recipes: Recipe[] = []
let plannedRecipes: PlannedRecipe[] = savedPlan ? JSON.parse(savedPlan) : []
let activeView: 'plan' | 'recipes' = 'plan'
let isRecipeFormOpen = false

const app = document.querySelector<HTMLDivElement>('#app')!

const savePlan = () => localStorage.setItem(storageKey, JSON.stringify(plannedRecipes))

const formatQuantity = (quantity: number) =>
  Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1).replace('.0', '')

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
  )

const getRecipe = (id: string) => recipes.find((recipe) => recipe.id === id)

const renderRecipeCard = (recipe: Recipe) => {
  const plan = plannedRecipes.find((item) => item.recipeId === recipe.id)
  return `
    <article class="recipe-card ${plan ? 'is-selected' : ''}">
      <div class="recipe-card-top">
        <span class="recipe-icon">${escapeHtml(recipe.name.charAt(0))}</span>
        <button class="select-button ${plan ? 'selected' : ''}" data-recipe="${escapeHtml(recipe.id)}">
          ${plan ? 'Added' : 'Add to week'}
        </button>
      </div>
      <div>
        <div class="eyebrow">${escapeHtml(recipe.tags.join(' · '))}</div>
        <h3>${escapeHtml(recipe.name)}</h3>
        <p>${escapeHtml(recipe.description)}</p>
      </div>
      <div class="recipe-meta">
        <span>◷ ${recipe.time} min</span>
        <span>♧ ${recipe.servings} servings</span>
      </div>
    </article>
  `
}

const categoryForIngredient = (name: string): Category => {
  const normalized = name.toLowerCase()
  if (/halloumi|cheese|cream|yogurt|milk/.test(normalized)) return 'Dairy'
  if (/chicken|salmon|beef|pork|turkey|fish/.test(normalized)) return 'Protein'
  if (/rice|pasta|oil|sauce|spice|mayo|mayonnaise|flour|sugar|salt/.test(normalized)) return 'Pantry'
  return 'Produce'
}

const parseOcrIngredients = (text: string): Ingredient[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[•|]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const start = lines.findIndex((line) => /ingredients/i.test(line))
  const end = lines.findIndex((line, index) => index > start && /before you start/i.test(line))
  const ingredientLines = lines.slice(start + 1, end > start ? end : start + 10)
  return ingredientLines.flatMap((line) => {
    if (/^x\d|ingredients/i.test(line)) return []
    const match =
      line.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|tbsp|tsp|cans?)?\s+(.+)$/i) ??
      line.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|tbsp|tsp|cans?)?$/i)
    if (!match) return []
    const quantity = Number((match[1].match(/\d/) ? match[1] : match[2]).replace(',', '.'))
    const unit = (match[1].match(/\d/) ? match[2] : match[3]) ?? ''
    const name = (match[1].match(/\d/) ? match[3] : match[1]).replace(/\s+A\d+(?:,\s*A\d+)*$/i, '').trim()
    return [{ name, quantity, unit, category: categoryForIngredient(name) }]
  })
}

const parseFormIngredients = (value: string): Ingredient[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [quantity, unit, name, category = categoryForIngredient(name)] = line.split('|').map((part) => part.trim())
      return { name, quantity: Number(quantity), unit, category: category as Category }
    })
    .filter((ingredient) => ingredient.name && Number.isFinite(ingredient.quantity))

const recipeForm = () => `
  <div class="modal-backdrop" data-close-modal>
    <section class="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
      <div class="modal-header">
        <div><div class="eyebrow">RECIPE CARD IMPORT</div><h2 id="recipe-modal-title">Add a recipe</h2></div>
        <button class="icon-button" type="button" aria-label="Close" data-close-modal>×</button>
      </div>
      <p class="modal-intro">Upload a recipe card to extract its text, then review the fields before saving.</p>
      <form id="recipe-form">
        <label class="upload-field">Recipe card image<input id="recipe-image" type="file" accept="image/*"></label>
        <p id="ocr-status" class="form-status" aria-live="polite"></p>
        <div class="form-grid">
          <label>Name<input name="name" required></label>
          <label>Description<input name="description" required></label>
          <label>Minutes<input name="time" type="number" min="1" value="30" required></label>
          <label>Servings<input name="servings" type="number" min="1" value="2" required></label>
          <label>Tags<input name="tags" placeholder="Quick, Vegetarian"></label>
        </div>
        <label>Ingredients <span class="field-help">quantity | unit | name | category</span>
          <textarea name="ingredients" rows="8" required placeholder="160 | g | Blanched peas | Produce"></textarea>
        </label>
        <div class="modal-actions"><button type="button" class="text-button" data-close-modal>Cancel</button><button type="submit" class="outline-button">Save recipe</button></div>
      </form>
    </section>
  </div>
`

const aggregateIngredients = () => {
  const grouped = new Map<Category, Map<string, { name: string; quantity: number; unit: string }>>()
  plannedRecipes.forEach(({ recipeId, servings }) => {
    const recipe = getRecipe(recipeId)
    if (!recipe) return
    recipe.ingredients.forEach((ingredient) => {
      const category = grouped.get(ingredient.category) ?? new Map()
      const key = `${ingredient.name.toLowerCase()}|${ingredient.unit}`
      const current = category.get(key)
      const scaled = ingredient.quantity * (servings / recipe.servings)
      category.set(key, { name: ingredient.name, quantity: (current?.quantity ?? 0) + scaled, unit: ingredient.unit })
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
                  <span>${escapeHtml(item.name)}</span>
                  <strong>${formatQuantity(item.quantity)} ${escapeHtml(item.unit)}</strong>
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
          ? `<section class="section-header"><div><div class="eyebrow">YOUR COLLECTION</div><h2>Recipes to cook</h2></div><button class="outline-button" data-new-recipe>＋ New recipe</button></section>
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
    ${isRecipeFormOpen ? recipeForm() : ''}
  `
  bindEvents()
}

const fillFormFromOcr = (text: string) => {
  const form = document.querySelector<HTMLFormElement>('#recipe-form')
  if (!form) return
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const title = lines.find((line) => /fried rice|chicken|pasta|curry|salmon|halloumi/i.test(line))
  const name = form.elements.namedItem('name') as HTMLInputElement
  const description = form.elements.namedItem('description') as HTMLInputElement
  const ingredients = form.elements.namedItem('ingredients') as HTMLTextAreaElement
  if (title) name.value = title.replace(/\s+/g, ' ').replace(/\s+\(V\)$/i, '')
  if (title) description.value = `${title.replace(/\s+\(V\)$/i, '')}.`
  const parsedIngredients = parseOcrIngredients(text)
  if (parsedIngredients.length) {
    ingredients.value = parsedIngredients.map((item) => `${item.quantity} | ${item.unit} | ${item.name} | ${item.category}`).join('\n')
  }
}

const runOcr = async (file: File) => {
  const status = document.querySelector<HTMLParagraphElement>('#ocr-status')
  if (!status) return
  status.textContent = 'Reading the recipe card…'
  try {
    const worker = await createWorker('eng')
    const result = await worker.recognize(file)
    await worker.terminate()
    fillFormFromOcr(result.data.text)
    status.textContent = 'Text extracted. Review the fields before saving.'
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Unable to read this image.'
  }
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
      const recipe = getRecipe(recipeId)
      if (!recipe) return
      const existing = plannedRecipes.find((item) => item.recipeId === recipeId)
      plannedRecipes = existing
        ? plannedRecipes.filter((item) => item.recipeId !== recipeId)
        : [...plannedRecipes, { recipeId, servings: recipe.servings }]
      savePlan()
      render()
    })
  })
  document.querySelectorAll<HTMLElement>('[data-new-recipe]').forEach((button) => {
    button.addEventListener('click', () => {
      isRecipeFormOpen = true
      render()
    })
  })
  document.querySelectorAll<HTMLElement>('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (event.target !== button && (event.target as HTMLElement).classList.contains('modal-backdrop')) return
      isRecipeFormOpen = false
      render()
    })
  })
  document.querySelector<HTMLInputElement>('#recipe-image')?.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) void runOcr(file)
  })
  document.querySelector<HTMLFormElement>('#recipe-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement
    const recipe: Recipe = {
      id: `recipe-${crypto.randomUUID()}`,
      name: field('name').value.trim(),
      description: field('description').value.trim(),
      time: Number(field('time').value),
      servings: Number(field('servings').value),
      tags: field('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      ingredients: parseFormIngredients((form.elements.namedItem('ingredients') as HTMLTextAreaElement).value),
    }
    if (!recipe.name || !recipe.description || !recipe.ingredients.length) return
    await saveRecipe(recipe)
    recipes = await listRecipes()
    isRecipeFormOpen = false
    render()
  })
}

const startApp = async () => {
  recipes = await initializeRecipes()
  const recipeIds = new Set(recipes.map((recipe) => recipe.id))
  const validPlan = plannedRecipes.filter((item) => recipeIds.has(item.recipeId))
  if (validPlan.length !== plannedRecipes.length) {
    plannedRecipes = validPlan
    savePlan()
  }
  render()
}

void startApp()
