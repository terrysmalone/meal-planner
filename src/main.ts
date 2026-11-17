import './style.css'
import { deleteRecipe, initializeRecipes, listRecipes, replaceRecipes, saveRecipe } from './recipe-store'
import type { Category, Ingredient, Recipe } from './recipe-store'

type PlannedRecipe = {
  recipeId: string
  servings: number
}

type IngredientConflict = {
  name: string
  units: Array<{ label: string; recipeIds: string[] }>
}

type RecipeFileHandle = {
  createWritable: () => Promise<{ write: (contents: string) => Promise<void>; close: () => Promise<void> }>
}

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: Array<{ description: string; accept: Record<string, string[]> }>
  }) => Promise<RecipeFileHandle>
}

const storageKey = 'meal-planner-plan'
const savedPlan = localStorage.getItem(storageKey)
let recipes: Recipe[] = []
let plannedRecipes: PlannedRecipe[] = savedPlan ? JSON.parse(savedPlan) : []
let activeView: 'plan' | 'recipes' = 'plan'
let isRecipeFormOpen = false
let viewingRecipeId: string | null = null
let editingRecipeId: string | null = null
let isAccountMenuOpen = false
let recipeSearchTerm = ''

const app = document.querySelector<HTMLDivElement>('#app')!

const savePlan = () => localStorage.setItem(storageKey, JSON.stringify(plannedRecipes))

const exportRecipeBackup = async () => {
  const contents = JSON.stringify(recipes, null, 2)
  const pickerWindow = window as SaveFilePickerWindow
  if (pickerWindow.showSaveFilePicker) {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: 'recipes.json',
        types: [{ description: 'JSON files', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(contents)
      await writable.close()
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      window.alert(error instanceof Error ? error.message : 'Unable to save the recipe backup.')
      return
    }
  }
  const file = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'recipes.json'
  link.click()
  URL.revokeObjectURL(url)
}

const isRecipeBackup = (value: unknown): value is Recipe[] => {
  if (!Array.isArray(value) || new Set(value.map((item) => (item as { id?: unknown }).id)).size !== value.length) return false
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false
    const recipe = item as Partial<Recipe>
    return (
      typeof recipe.id === 'string' &&
      typeof recipe.name === 'string' &&
      typeof recipe.description === 'string' &&
      typeof recipe.time === 'number' &&
      typeof recipe.servings === 'number' &&
      Array.isArray(recipe.tags) &&
      recipe.tags.every((tag) => typeof tag === 'string') &&
      Array.isArray(recipe.ingredients) &&
      recipe.ingredients.every((ingredient) => {
        if (!ingredient || typeof ingredient !== 'object') return false
        const value = ingredient as Partial<Ingredient>
        return (
          typeof value.name === 'string' &&
          typeof value.quantity === 'number' &&
          typeof value.unit === 'string' &&
          ['Produce', 'Protein', 'Dairy', 'Pantry'].includes(value.category ?? '')
        )
      })
    )
  })
}

const importRecipeBackup = async (file: File) => {
  try {
    const data: unknown = JSON.parse(await file.text())
    if (!isRecipeBackup(data)) throw new Error('This file is not a valid recipes.json backup.')
    await replaceRecipes(data)
    recipes = data
    const recipeIds = new Set(recipes.map((recipe) => recipe.id))
    plannedRecipes = plannedRecipes.filter((item) => recipeIds.has(item.recipeId))
    savePlan()
    render()
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Unable to import this backup.')
  }
}

const formatQuantity = (quantity: number) =>
  Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(1).replace('.0', '')

const nextWeekLabel = () => {
  const today = new Date()
  const daysUntilNextMonday = ((8 - today.getDay()) % 7) || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() + daysUntilNextMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' })
  const startMonth = monthFormatter.format(monday)
  const endMonth = monthFormatter.format(sunday)
  return startMonth === endMonth
    ? `${startMonth} ${monday.getDate()}–${sunday.getDate()}`
    : `${startMonth} ${monday.getDate()}–${endMonth} ${sunday.getDate()}`
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
  )

const getRecipe = (id: string) => recipes.find((recipe) => recipe.id === id)

const recipeMatchesSearch = (recipe: Recipe, term: string) => {
  const searchableText = [
    recipe.name,
    recipe.description,
    ...recipe.tags,
    ...recipe.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.unit, ingredient.category]),
  ]
    .join(' ')
    .toLowerCase()
  return searchableText.includes(term.trim().toLowerCase())
}

const normalizeIngredientPart = (value: string) => value.trim().toLowerCase()

const findIngredientConflicts = (candidateRecipes: Recipe[], excludedRecipeId?: string): IngredientConflict[] => {
  const ingredientsByName = new Map<
    string,
    { name: string; units: Map<string, { label: string; recipeIds: Set<string> }> }
  >()
  candidateRecipes
    .filter((recipe) => recipe.id !== excludedRecipeId)
    .forEach((recipe) => {
      recipe.ingredients.forEach((ingredient) => {
        const nameKey = normalizeIngredientPart(ingredient.name)
        const unitKey = normalizeIngredientPart(ingredient.unit)
        const ingredientEntry = ingredientsByName.get(nameKey) ?? { name: ingredient.name.trim(), units: new Map() }
        const unitEntry = ingredientEntry.units.get(unitKey) ?? { label: ingredient.unit.trim(), recipeIds: new Set<string>() }
        unitEntry.recipeIds.add(recipe.id)
        ingredientEntry.units.set(unitKey, unitEntry)
        ingredientsByName.set(nameKey, ingredientEntry)
      })
    })
  return [...ingredientsByName.values()]
    .filter((ingredient) => ingredient.units.size > 1)
    .map((ingredient) => ({
      name: ingredient.name,
      units: [...ingredient.units.values()].map((unit) => ({ label: unit.label, recipeIds: [...unit.recipeIds] })),
    }))
    .sort((first, second) => first.name.localeCompare(second.name))
}

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
      <div class="recipe-card-actions">
        <button class="text-button" data-view-recipe="${escapeHtml(recipe.id)}">View recipe</button>
        <button class="text-button" data-edit-recipe="${escapeHtml(recipe.id)}">Edit</button>
        <button class="delete-button" data-delete-recipe="${escapeHtml(recipe.id)}">Delete</button>
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

const recipeForm = (recipe?: Recipe) => `
  <div class="modal-backdrop" data-close-modal>
    <section class="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title">
      <div class="modal-header">
        <div><div class="eyebrow">RECIPE DETAILS</div><h2 id="recipe-modal-title">${recipe ? 'Edit recipe' : 'Add a recipe'}</h2></div>
        <button class="icon-button" type="button" aria-label="Close" data-close-modal>×</button>
      </div>
      <p class="modal-intro">${recipe ? 'Update the recipe details below.' : 'Enter the recipe details below.'}</p>
      <form id="recipe-form">
        <div class="form-grid">
          <label>Name<input name="name" value="${escapeHtml(recipe?.name ?? '')}" required></label>
          <label>Description<input name="description" value="${escapeHtml(recipe?.description ?? '')}" required></label>
          <label>Minutes<input name="time" type="number" min="1" value="${recipe?.time ?? 30}" required></label>
          <label>Servings<input name="servings" type="number" min="1" value="${recipe?.servings ?? 2}" required></label>
          <label>Tags<input name="tags" value="${escapeHtml(recipe?.tags.join(', ') ?? '')}" placeholder="Quick, Vegetarian"></label>
        </div>
        <label>Ingredients <span class="field-help">quantity | unit | name | category</span>
          <textarea name="ingredients" rows="8" required placeholder="160 | g | Blanched peas | Produce">${recipe?.ingredients.map((item) => `${item.quantity} | ${item.unit} | ${item.name} | ${item.category}`).join('\n') ?? ''}</textarea>
        </label>
        <div class="modal-actions"><button type="button" class="text-button" data-close-modal>Cancel</button><button type="submit" class="outline-button">${recipe ? 'Save changes' : 'Save recipe'}</button></div>
      </form>
    </section>
  </div>
`

const recipeDetails = (recipe: Recipe) => `
  <div class="modal-backdrop" data-close-details>
    <section class="recipe-modal recipe-details" role="dialog" aria-modal="true" aria-labelledby="recipe-details-title">
      <div class="modal-header">
        <div><div class="eyebrow">${escapeHtml(recipe.tags.join(' · '))}</div><h2 id="recipe-details-title">${escapeHtml(recipe.name)}</h2></div>
        <button class="icon-button" type="button" aria-label="Close" data-close-details>×</button>
      </div>
      <p class="modal-intro">${escapeHtml(recipe.description)}</p>
      <div class="recipe-detail-meta"><span>◷ ${recipe.time} min</span><span>♧ ${recipe.servings} servings</span></div>
      <h3>Ingredients</h3>
      <ul class="ingredient-list">
        ${recipe.ingredients.map((ingredient) => `<li><span>${formatQuantity(ingredient.quantity)} ${escapeHtml(ingredient.unit)} ${escapeHtml(ingredient.name)}</span><strong>${escapeHtml(ingredient.category)}</strong></li>`).join('')}
      </ul>
      <div class="modal-actions"><button type="button" class="text-button" data-edit-recipe="${escapeHtml(recipe.id)}">Edit recipe</button></div>
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
      const key = JSON.stringify([ingredient.name.trim().toLowerCase(), ingredient.unit.trim().toLowerCase()])
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
  const planned = plannedRecipes.map(({ recipeId }) => getRecipe(recipeId)).filter((recipe): recipe is Recipe => Boolean(recipe))
  const conflicts = findIngredientConflicts(planned)
  const conflictWarning = conflicts.length
    ? `
      <div class="shopping-warning">
        <div class="shopping-warning-heading"><strong>Check ingredient measurements</strong><span>${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}</span></div>
        <p>These ingredients use different units. Edit the recipes below if you want them combined into one shopping-list item.</p>
        <ul>
          ${conflicts
            .map(
              (conflict) => `
                <li>
                  <strong>${escapeHtml(conflict.name)}</strong>
                  <span>${conflict.units
                    .map(
                      (unit) =>
                        `${escapeHtml(unit.label || 'no unit')}: ${unit.recipeIds
                          .map((recipeId) => getRecipe(recipeId)?.name)
                          .filter((name): name is string => Boolean(name))
                          .map(escapeHtml)
                          .join(', ')}`,
                    )
                    .join(' · ')}</span>
                  <div>${[...new Set(conflict.units.flatMap((unit) => unit.recipeIds))]
                    .map(
                      (recipeId) =>
                        `<button type="button" class="text-button" data-edit-recipe="${escapeHtml(recipeId)}">Edit ${escapeHtml(getRecipe(recipeId)?.name ?? 'recipe')}</button>`,
                    )
                    .join('')}</div>
                </li>
              `,
            )
            .join('')}
        </ul>
      </div>
    `
    : ''
  const categories: Category[] = ['Produce', 'Protein', 'Dairy', 'Pantry']
  return `${conflictWarning}${categories
    .filter((category) => grouped.has(category))
    .map(
      (category) => `
        <section class="shopping-group">
          <div class="shopping-heading"><h3>${category}</h3><span>${grouped.get(category)!.size} items</span></div>
          ${[...grouped.get(category)!.values()]
            .sort((first, second) => first.name.localeCompare(second.name))
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
    .join('')}`
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
      <div class="topbar-actions"><div class="account-menu"><button type="button" class="avatar" data-account-menu aria-haspopup="menu" aria-expanded="${isAccountMenuOpen}">TM</button><div class="account-dropdown ${isAccountMenuOpen ? 'is-open' : ''}" role="menu"><div class="account-label">ACCOUNT</div><button type="button" class="dropdown-action" data-export-recipes>Export backup</button><label class="dropdown-action">Import backup<input id="recipe-backup" type="file" accept=".json,application/json"></label></div></div></div>
    </header>
    <main>
      <section class="hero">
        <div>
          <div class="eyebrow">WEEK OF ${nextWeekLabel().toUpperCase()}</div>
          <h1>Give a man a fish and he'll eat for a day.<br><i>Teach him how to fish and he'll eat for life.</i></h1>
          <p>Choose your meals for the week and we’ll take care of the shopping list.</p>
        </div>
        <div class="week-summary"><span class="summary-label">THIS WEEK</span><strong>${plannedRecipes.length} <small>meals</small></strong><span>${totalServings} servings planned</span></div>
      </section>
      ${
        activeView === 'recipes'
          ? (() => {
              const filteredRecipes = recipes.filter((recipe) => recipeMatchesSearch(recipe, recipeSearchTerm))
              return `<section class="section-header"><div><div class="eyebrow">YOUR COLLECTION</div><h2>Recipes to cook</h2></div><div class="recipe-actions"><input class="recipe-search" id="recipe-search" type="search" value="${escapeHtml(recipeSearchTerm)}" placeholder="Search recipes"><button class="outline-button" data-new-recipe>＋ New recipe</button></div></section>
             ${filteredRecipes.length ? `<section class="recipe-grid">${filteredRecipes.map(renderRecipeCard).join('')}</section>` : '<div class="empty-state recipe-no-results"><span class="empty-icon">⌕</span><h3>No recipes found</h3><p>Try a different name, ingredient, tag, or category.</p></div>'}`
            })()
          : `<div class="content-grid">
              <section>
                <div class="section-header"><div><div class="eyebrow">YOUR WEEK</div><h2>Chosen meals</h2></div><button class="text-button" data-view="recipes">Add recipes →</button></div>
                ${
                  plannedRecipes.length
                    ? `<div class="recipe-grid">${plannedRecipes.map(({ recipeId }) => getRecipe(recipeId)).filter((recipe): recipe is Recipe => Boolean(recipe)).map(renderRecipeCard).join('')}</div>`
                    : '<div class="empty-state recipe-no-results"><span class="empty-icon">✦</span><h3>No meals chosen</h3><p>Visit My recipes to add meals to your week.</p></div>'
                }
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
    ${isRecipeFormOpen ? recipeForm(editingRecipeId ? getRecipe(editingRecipeId) : undefined) : ''}
    ${viewingRecipeId ? recipeDetails(getRecipe(viewingRecipeId)!) : ''}
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
      editingRecipeId = null
      render()
    })
    document.querySelector<HTMLInputElement>('#recipe-search')?.addEventListener('input', (event) => {
      recipeSearchTerm = (event.target as HTMLInputElement).value
      const cursorPosition = recipeSearchTerm.length
      render()
      const searchInput = document.querySelector<HTMLInputElement>('#recipe-search')
      searchInput?.focus()
      searchInput?.setSelectionRange(cursorPosition, cursorPosition)
    })
  })
  document.querySelectorAll<HTMLElement>('[data-export-recipes]').forEach((button) => {
    button.addEventListener('click', () => void exportRecipeBackup())
  })
  document.querySelector<HTMLInputElement>('#recipe-backup')?.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) void importRecipeBackup(file)
  })
  document.querySelector<HTMLButtonElement>('[data-account-menu]')?.addEventListener('click', () => {
    isAccountMenuOpen = !isAccountMenuOpen
    const button = document.querySelector<HTMLButtonElement>('[data-account-menu]')
    const dropdown = document.querySelector<HTMLDivElement>('.account-dropdown')
    button?.setAttribute('aria-expanded', String(isAccountMenuOpen))
    dropdown?.classList.toggle('is-open', isAccountMenuOpen)
  })
  document.querySelectorAll<HTMLElement>('[data-view-recipe]').forEach((button) => {
  button.addEventListener('click', () => {
    viewingRecipeId = button.dataset.viewRecipe!
    render()
  })
  })
  document.querySelectorAll<HTMLElement>('[data-edit-recipe]').forEach((button) => {
  button.addEventListener('click', () => {
    editingRecipeId = button.dataset.editRecipe!
    viewingRecipeId = null
    isRecipeFormOpen = true
    render()
  })
  })
    document.querySelectorAll<HTMLElement>('[data-close-details]').forEach((button) => {
      button.addEventListener('click', (event) => {
        if (event.target !== button) return
        viewingRecipeId = null
        render()
      })
    })
    document.querySelectorAll<HTMLElement>('[data-delete-recipe]').forEach((button) => {
      button.addEventListener('click', async () => {
        const recipeId = button.dataset.deleteRecipe!
        const recipe = getRecipe(recipeId)
        if (!recipe || !window.confirm(`Delete "${recipe.name}"?`)) return
        await deleteRecipe(recipeId)
        recipes = await listRecipes()
        plannedRecipes = plannedRecipes.filter((item) => item.recipeId !== recipeId)
        savePlan()
        if (viewingRecipeId === recipeId) viewingRecipeId = null
        render()
      })
    })
  document.querySelectorAll<HTMLElement>('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', (event) => {
      if (event.target !== button) return
      isRecipeFormOpen = false
      editingRecipeId = null
      render()
    })
  })
  document.querySelector<HTMLFormElement>('#recipe-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement
    const recipe: Recipe = {
      id: editingRecipeId ?? `recipe-${crypto.randomUUID()}`,
      name: field('name').value.trim(),
      description: field('description').value.trim(),
      time: Number(field('time').value),
      servings: Number(field('servings').value),
      tags: field('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
      ingredients: parseFormIngredients((form.elements.namedItem('ingredients') as HTMLTextAreaElement).value),
    }
    if (!recipe.name || !recipe.description || !recipe.ingredients.length) return
    const conflicts = findIngredientConflicts([...recipes.filter((existing) => existing.id !== recipe.id), recipe]).filter((conflict) =>
      conflict.units.some((unit) => unit.recipeIds.includes(recipe.id)),
    )
    if (conflicts.length) {
      const details = conflicts
        .map((conflict) => `${conflict.name}: ${conflict.units.map((unit) => unit.label || 'no unit').join(' / ')}`)
        .join('\n')
      if (!window.confirm(`This recipe uses different units for ingredients already in your recipes:\n\n${details}\n\nChoose OK to save anyway, or Cancel to return and fix the measurements.`)) return
    }
    await saveRecipe(recipe)
    recipes = await listRecipes()
    isRecipeFormOpen = false
    editingRecipeId = null
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
