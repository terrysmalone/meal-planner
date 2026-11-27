import './style.css'
import { createHousehold, getSession, joinHousehold, listHouseholds, signIn, signOut, signUp } from './auth'
import {
  deleteRecipe,
  deleteShoppingItem,
  initializeRecipes,
  listRecipes,
  listShoppingItems,
  listShoppingSections,
  listWeeklyPlans,
  replaceRecipes,
  replaceShoppingItems,
  replaceShoppingSections,
  replaceWeeklyPlans,
  saveRecipe,
  saveShoppingItem,
  saveShoppingSection,
  loadWeeklyPlan,
  saveWeeklyPlan,
  setActiveHousehold,
} from './recipe-store'
import type { Household } from './auth'
import type { Category, Ingredient, ManualShoppingItem, Recipe, WeeklyPlanItem, WeeklyPlanRecord } from './recipe-store'
import type { User } from '@supabase/supabase-js'

type PlannedRecipe = WeeklyPlanItem

type ShoppingListItem = {
  id: string
  name: string
  quantity?: number
  unit?: string
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
const selectedWeekStorageKey = 'meal-planner-selected-week'
const legacyManualShoppingStorageKey = 'meal-planner-shopping-items'
const legacyManualShoppingSectionsStorageKey = 'meal-planner-shopping-sections'
const manualShoppingSelectionStorageKey = 'meal-planner-selected-shopping-items'
const boughtShoppingStorageKey = 'meal-planner-bought-shopping-items'
const defaultShoppingSections = ['Produce', 'Protein', 'Dairy', 'Pantry']
const mondayForDate = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = monday.getDay()
  monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day))
  return monday
}
const dateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const defaultWeekDate = mondayForDate(new Date())
defaultWeekDate.setDate(defaultWeekDate.getDate() + 7)
const defaultWeekStart = dateKey(defaultWeekDate)
let selectedWeekStart = defaultWeekStart
const weekStorageKey = (weekStart: string) => `${storageKey}-${weekStart}`
const weekShoppingSelectionStorageKey = (weekStart: string) => `${manualShoppingSelectionStorageKey}-${weekStart}`
const weekBoughtShoppingStorageKey = (weekStart: string) => `${boughtShoppingStorageKey}-${weekStart}`
const savedPlan = localStorage.getItem(weekStorageKey(selectedWeekStart)) ?? localStorage.getItem(storageKey)
const savedManualShoppingItems = localStorage.getItem(legacyManualShoppingStorageKey)
const savedManualShoppingSelection = localStorage.getItem(manualShoppingSelectionStorageKey)
const savedManualShoppingQuantities = localStorage.getItem(`${manualShoppingSelectionStorageKey}-quantities`)
const savedBoughtShoppingItems = localStorage.getItem(weekBoughtShoppingStorageKey(selectedWeekStart)) ?? localStorage.getItem(boughtShoppingStorageKey)
const savedManualShoppingSections = localStorage.getItem(legacyManualShoppingSectionsStorageKey)
const legacyManualShoppingItems: ManualShoppingItem[] = savedManualShoppingItems
  ? (JSON.parse(savedManualShoppingItems) as Array<Partial<ManualShoppingItem>>).map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      name: item.name ?? '',
      section: item.section ?? 'Pantry',
      quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
      unit: item.unit ?? '',
    }))
  : []
let recipes: Recipe[] = []
const parseArray = <T>(value: string | null): T[] => {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    console.warn('Ignoring invalid local array data.')
    return []
  }
}

const isShoppingItemQuantities = (value: unknown): value is Record<string, number> =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value as Record<string, unknown>).every(
    (quantity) => typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0,
  )

const parseShoppingItemQuantities = (value: string | null): Record<string, number> => {
  if (!value) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    return isShoppingItemQuantities(parsed) ? parsed : {}
  } catch {
    console.warn('Ignoring invalid shopping item quantities.')
    return {}
  }
}

let plannedRecipes: PlannedRecipe[] = parseArray<PlannedRecipe>(savedPlan)
let manualShoppingItems: ManualShoppingItem[] = []
let manualShoppingSearch = ''
let manualShoppingSections: string[] = parseArray<string>(savedManualShoppingSections)
let selectedManualShoppingIds: string[] = parseArray<string>(savedManualShoppingSelection)
let selectedManualShoppingQuantities: Record<string, number> = parseShoppingItemQuantities(savedManualShoppingQuantities)
let boughtShoppingItemIds: string[] = parseArray<string>(savedBoughtShoppingItems)
let activeView: 'plan' | 'recipes' | 'shopping' | 'list' = 'plan'
let isRecipeFormOpen = false
let viewingRecipeId: string | null = null
let editingRecipeId: string | null = null
let isAccountMenuOpen = false
let recipeSearchTerm = ''
let currentUser: User | null = null
let currentHousehold: Household | null = null
let loadedWeeklyPlanFromRemote = false
let authMode: 'sign-in' | 'sign-up' = 'sign-in'
let authError = ''
let planSaveQueue = Promise.resolve()

const app = document.querySelector<HTMLDivElement>('#app')!

const savePlan = async () => {
  localStorage.setItem(weekStorageKey(selectedWeekStart), JSON.stringify(plannedRecipes))
  localStorage.setItem(selectedWeekStorageKey, selectedWeekStart)
  if (selectedWeekStart === defaultWeekStart) localStorage.setItem(storageKey, JSON.stringify(plannedRecipes))
  const weekStart = selectedWeekStart
  const plan = {
    recipes: plannedRecipes,
    selectedShoppingItemIds: selectedManualShoppingIds,
    boughtShoppingItemIds,
    shoppingItemQuantities: selectedManualShoppingQuantities,
  }
  planSaveQueue = planSaveQueue.then(() => saveWeeklyPlan(weekStart, plan))
  await planSaveQueue
}
const saveManualShoppingSelection = () => {
  const serializedSelection = JSON.stringify(selectedManualShoppingIds)
  localStorage.setItem(manualShoppingSelectionStorageKey, serializedSelection)
  localStorage.setItem(weekShoppingSelectionStorageKey(selectedWeekStart), serializedSelection)
  localStorage.setItem(`${manualShoppingSelectionStorageKey}-quantities`, JSON.stringify(selectedManualShoppingQuantities))
  localStorage.setItem(`${weekShoppingSelectionStorageKey(selectedWeekStart)}-quantities`, JSON.stringify(selectedManualShoppingQuantities))
  void savePlan()
}
const saveBoughtShoppingItems = async () => {
  const serializedBoughtItems = JSON.stringify(boughtShoppingItemIds)
  localStorage.setItem(boughtShoppingStorageKey, serializedBoughtItems)
  localStorage.setItem(weekBoughtShoppingStorageKey(selectedWeekStart), serializedBoughtItems)
  await savePlan()
}
const mirrorShoppingItems = () => localStorage.setItem(legacyManualShoppingStorageKey, JSON.stringify(manualShoppingItems))
const mirrorShoppingSections = () => localStorage.setItem(legacyManualShoppingSectionsStorageKey, JSON.stringify(manualShoppingSections))

const localWeeklyPlans = () => {
  const plans = new Map<string, WeeklyPlanRecord>()
  Object.keys(localStorage)
    .filter((key) => key.startsWith(`${storageKey}-`))
    .forEach((key) => {
      const weekStart = key.slice(`${storageKey}-`.length)
      const recipes = parseArray<PlannedRecipe>(localStorage.getItem(key))
      const selectedShoppingItemIds = parseArray<string>(localStorage.getItem(weekShoppingSelectionStorageKey(weekStart)))
      const boughtShoppingItemIds = parseArray<string>(localStorage.getItem(weekBoughtShoppingStorageKey(weekStart)))
      const shoppingItemQuantities = parseShoppingItemQuantities(localStorage.getItem(`${weekShoppingSelectionStorageKey(weekStart)}-quantities`))
      plans.set(weekStart, { weekStart, recipes, selectedShoppingItemIds, boughtShoppingItemIds, shoppingItemQuantities })
    })
  return [...plans.values()]
}

const weeklyPlansForBackup = async () => {
  const plans = new Map(localWeeklyPlans().map((plan) => [plan.weekStart, plan]))
  ;(await listWeeklyPlans()).forEach((plan) => plans.set(plan.weekStart, plan))
  plans.set(selectedWeekStart, {
    weekStart: selectedWeekStart,
    recipes: plannedRecipes,
    selectedShoppingItemIds: selectedManualShoppingIds,
    boughtShoppingItemIds,
    shoppingItemQuantities: selectedManualShoppingQuantities,
  })
  return [...plans.values()].sort((first, second) => first.weekStart.localeCompare(second.weekStart))
}

const exportRecipeBackup = async () => {
  const weeklyPlans = await weeklyPlansForBackup()
  const contents = JSON.stringify(
    {
      recipes,
      shoppingItems: manualShoppingItems,
      shoppingSections: manualShoppingSections,
      selectedShoppingItemIds: selectedManualShoppingIds,
      shoppingItemQuantities: selectedManualShoppingQuantities,
      weeklyPlans,
    },
    null,
    2,
  )
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

const isManualShoppingItems = (value: unknown): value is ManualShoppingItem[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as ManualShoppingItem).id === 'string' &&
      typeof (item as ManualShoppingItem).name === 'string' &&
      typeof (item as ManualShoppingItem).section === 'string' &&
      ((item as ManualShoppingItem).quantity === undefined || typeof (item as ManualShoppingItem).quantity === 'number') &&
      ((item as ManualShoppingItem).unit === undefined || typeof (item as ManualShoppingItem).unit === 'string'),
  )

type RecipeBackup = {
  recipes: Recipe[]
  shoppingItems: ManualShoppingItem[]
  shoppingSections: string[]
  selectedShoppingItemIds: string[]
  shoppingItemQuantities?: Record<string, number>
  weeklyPlans: WeeklyPlanRecord[] | null
}

const isWeeklyPlanRecords = (value: unknown): value is WeeklyPlanRecord[] =>
  Array.isArray(value) &&
  value.every(
    (plan) =>
      plan &&
      typeof plan === 'object' &&
      typeof (plan as WeeklyPlanRecord).weekStart === 'string' &&
      Array.isArray((plan as WeeklyPlanRecord).recipes) &&
      (plan as WeeklyPlanRecord).recipes.every(
        (recipe) =>
          recipe &&
          typeof recipe.recipeId === 'string' &&
          typeof recipe.servings === 'number',
      ) &&
      Array.isArray((plan as WeeklyPlanRecord).selectedShoppingItemIds) &&
      (plan as WeeklyPlanRecord).selectedShoppingItemIds.every((id) => typeof id === 'string') &&
      ((plan as Partial<WeeklyPlanRecord>).boughtShoppingItemIds === undefined ||
        (Array.isArray((plan as Partial<WeeklyPlanRecord>).boughtShoppingItemIds) &&
          (plan as Partial<WeeklyPlanRecord>).boughtShoppingItemIds!.every((id) => typeof id === 'string'))) &&
      ((plan as Partial<WeeklyPlanRecord>).shoppingItemQuantities === undefined ||
        isShoppingItemQuantities((plan as Partial<WeeklyPlanRecord>).shoppingItemQuantities)),
  )

const parseRecipeBackup = (value: unknown): RecipeBackup | null => {
  if (isRecipeBackup(value)) {
    return {
      recipes: value,
      shoppingItems: manualShoppingItems,
      shoppingSections: manualShoppingSections,
      selectedShoppingItemIds: selectedManualShoppingIds,
      shoppingItemQuantities: selectedManualShoppingQuantities,
      weeklyPlans: null,
    }
  }
  if (!value || typeof value !== 'object') return null
  const backup = value as Partial<RecipeBackup>
  if (
    !isRecipeBackup(backup.recipes) ||
    !isManualShoppingItems(backup.shoppingItems) ||
    !Array.isArray(backup.shoppingSections) ||
    !backup.shoppingSections.every((section) => typeof section === 'string') ||
    !Array.isArray(backup.selectedShoppingItemIds) ||
    !backup.selectedShoppingItemIds.every((id) => typeof id === 'string') ||
    (backup.shoppingItemQuantities !== undefined && !isShoppingItemQuantities(backup.shoppingItemQuantities)) ||
    (backup.weeklyPlans !== undefined && !isWeeklyPlanRecords(backup.weeklyPlans))
  ) {
    return null
  }
  return {
    recipes: backup.recipes,
    shoppingItems: backup.shoppingItems,
    shoppingSections: backup.shoppingSections,
    selectedShoppingItemIds: backup.selectedShoppingItemIds,
    shoppingItemQuantities: backup.shoppingItemQuantities ?? {},
    weeklyPlans: backup.weeklyPlans ?? null,
  }
}

const importRecipeBackup = async (file: File) => {
  try {
    const data: unknown = JSON.parse(await file.text())
    const backup = parseRecipeBackup(data)
    if (!backup) throw new Error('This file is not a valid recipes.json backup.')
    const recipeOnlyImport = Array.isArray(data)
    if (recipeOnlyImport) {
      const existingRecipes = await listRecipes()
      const recipesById = new Map(existingRecipes.map((recipe) => [recipe.id, recipe]))
      backup.recipes.forEach((recipe) => recipesById.set(recipe.id, recipe))
      recipes = [...recipesById.values()]
      await replaceRecipes(recipes)
    } else {
      await replaceRecipes(backup.recipes)
      recipes = backup.recipes
    }
    if (!recipeOnlyImport) {
      await replaceShoppingItems(backup.shoppingItems)
      await replaceShoppingSections(backup.shoppingSections)
    }
    if (backup.weeklyPlans) {
      const weeklyPlans = backup.weeklyPlans.map((plan) => ({
        ...plan,
        boughtShoppingItemIds: plan.boughtShoppingItemIds ?? [],
        shoppingItemQuantities: plan.shoppingItemQuantities ?? {},
      }))
      await replaceWeeklyPlans(weeklyPlans)
      Object.keys(localStorage)
        .filter(
          (key) =>
            key.startsWith(`${storageKey}-`) ||
            key.startsWith(`${manualShoppingSelectionStorageKey}-`) ||
            key.startsWith(`${boughtShoppingStorageKey}-`),
        )
        .forEach((key) => localStorage.removeItem(key))
      weeklyPlans.forEach((plan) => {
        localStorage.setItem(weekStorageKey(plan.weekStart), JSON.stringify(plan.recipes))
        localStorage.setItem(weekShoppingSelectionStorageKey(plan.weekStart), JSON.stringify(plan.selectedShoppingItemIds))
        localStorage.setItem(`${weekShoppingSelectionStorageKey(plan.weekStart)}-quantities`, JSON.stringify(plan.shoppingItemQuantities))
        localStorage.setItem(weekBoughtShoppingStorageKey(plan.weekStart), JSON.stringify(plan.boughtShoppingItemIds))
      })
    }
    if (!recipeOnlyImport) {
      manualShoppingItems = backup.shoppingItems
      manualShoppingSections = backup.shoppingSections
    }
    const importedWeek = backup.weeklyPlans?.find((plan) => plan.weekStart === selectedWeekStart)
    plannedRecipes = importedWeek?.recipes ?? (backup.weeklyPlans ? [] : plannedRecipes)
    selectedManualShoppingIds = (importedWeek?.selectedShoppingItemIds ?? backup.selectedShoppingItemIds)
      .filter((id) => manualShoppingItems.some((item) => item.id === id))
    selectedManualShoppingQuantities = importedWeek?.shoppingItemQuantities ?? backup.shoppingItemQuantities ?? {}
    boughtShoppingItemIds = (importedWeek?.boughtShoppingItemIds ?? []).filter((id) => typeof id === 'string')
    mirrorShoppingItems()
    mirrorShoppingSections()
    saveManualShoppingSelection()
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

const selectedWeekLabel = () => {
  const [year, month, day] = selectedWeekStart.split('-').map(Number)
  const monday = new Date(year, month - 1, day)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' })
  const startMonth = monthFormatter.format(monday)
  const endMonth = monthFormatter.format(sunday)
  return startMonth === endMonth
    ? `${startMonth} ${monday.getDate()}–${sunday.getDate()}`
    : `${startMonth} ${monday.getDate()}–${endMonth} ${sunday.getDate()}`
}

const loadSelectedWeekPlan = async () => {
  const savedLocalPlan = localStorage.getItem(weekStorageKey(selectedWeekStart))
    ?? (selectedWeekStart === defaultWeekStart ? localStorage.getItem(storageKey) : null)
  const localPlan = parseArray<PlannedRecipe>(savedLocalPlan)
  const savedLocalSelection = localStorage.getItem(weekShoppingSelectionStorageKey(selectedWeekStart))
    ?? (selectedWeekStart === defaultWeekStart ? localStorage.getItem(manualShoppingSelectionStorageKey) : null)
  const localSelection = parseArray<string>(savedLocalSelection)
  const localQuantities = parseShoppingItemQuantities(localStorage.getItem(`${manualShoppingSelectionStorageKey}-quantities`))
  const weekQuantities = parseShoppingItemQuantities(localStorage.getItem(`${weekShoppingSelectionStorageKey(selectedWeekStart)}-quantities`))
  const savedLocalBoughtItems = localStorage.getItem(weekBoughtShoppingStorageKey(selectedWeekStart))
    ?? (selectedWeekStart === defaultWeekStart ? localStorage.getItem(boughtShoppingStorageKey) : null)
  const localBoughtItems = parseArray<string>(savedLocalBoughtItems)
  const remotePlan = await loadWeeklyPlan(selectedWeekStart)
  loadedWeeklyPlanFromRemote = remotePlan !== null
  plannedRecipes = remotePlan && Array.isArray(remotePlan.recipes) ? remotePlan.recipes : localPlan
  if (remotePlan) {
    selectedManualShoppingIds = Array.isArray(remotePlan.selectedShoppingItemIds) ? remotePlan.selectedShoppingItemIds : []
    boughtShoppingItemIds = Array.isArray(remotePlan.boughtShoppingItemIds) ? remotePlan.boughtShoppingItemIds : []
    if (!Object.keys(selectedManualShoppingQuantities).length) {
      selectedManualShoppingQuantities = localQuantities
    }
    if (!Object.keys(selectedManualShoppingQuantities).length) {
      selectedManualShoppingQuantities = weekQuantities
    }
    if (!Object.keys(selectedManualShoppingQuantities).length) {
      selectedManualShoppingQuantities = remotePlan.shoppingItemQuantities ?? {}
    }
  }
  else {
    selectedManualShoppingIds = localSelection
    boughtShoppingItemIds = localBoughtItems
    selectedManualShoppingQuantities = Object.keys(selectedManualShoppingQuantities).length
      ? selectedManualShoppingQuantities
      : localQuantities
  }
  localStorage.setItem(weekStorageKey(selectedWeekStart), JSON.stringify(plannedRecipes))
  if (selectedWeekStart === defaultWeekStart) localStorage.setItem(storageKey, JSON.stringify(plannedRecipes))
  localStorage.setItem(weekShoppingSelectionStorageKey(selectedWeekStart), JSON.stringify(selectedManualShoppingIds))
  localStorage.setItem(`${weekShoppingSelectionStorageKey(selectedWeekStart)}-quantities`, JSON.stringify(selectedManualShoppingQuantities))
  if (selectedWeekStart === defaultWeekStart) localStorage.setItem(manualShoppingSelectionStorageKey, JSON.stringify(selectedManualShoppingIds))
  localStorage.setItem(weekBoughtShoppingStorageKey(selectedWeekStart), JSON.stringify(boughtShoppingItemIds))
  if (selectedWeekStart === defaultWeekStart) localStorage.setItem(boughtShoppingStorageKey, JSON.stringify(boughtShoppingItemIds))
  if (remotePlan === null && (localPlan.length || localSelection.length || localBoughtItems.length)) {
    await saveWeeklyPlan(selectedWeekStart, {
      recipes: localPlan,
      selectedShoppingItemIds: localSelection,
      boughtShoppingItemIds: localBoughtItems,
      shoppingItemQuantities: localQuantities,
    })
  }
}

const changeSelectedWeek = async (offset: number) => {
  await savePlan()
  const [year, month, day] = selectedWeekStart.split('-').map(Number)
  const nextMonday = new Date(year, month - 1, day)
  nextMonday.setDate(nextMonday.getDate() + offset * 7)
  selectedWeekStart = dateKey(nextMonday)
  await loadSelectedWeekPlan()
  render()
}

const returnToDefaultWeek = async () => {
  await savePlan()
  selectedWeekStart = defaultWeekStart
  await loadSelectedWeekPlan()
  render()
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

const shoppingSections = () => [...defaultShoppingSections, ...manualShoppingSections.filter((section) => !defaultShoppingSections.includes(section))]

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
  const grouped = new Map<string, Map<string, ShoppingListItem>>()
  plannedRecipes.forEach(({ recipeId, servings }) => {
    const recipe = getRecipe(recipeId)
    if (!recipe) return
    recipe.ingredients.forEach((ingredient) => {
      const category = grouped.get(ingredient.category) ?? new Map()
      const key = JSON.stringify([ingredient.name.trim().toLowerCase(), ingredient.unit.trim().toLowerCase()])
      const current = category.get(key)
      const scaled = ingredient.quantity * (servings / recipe.servings)
      category.set(key, { id: `ingredient:${key}`, name: ingredient.name, quantity: (current?.quantity ?? 0) + scaled, unit: ingredient.unit })
      grouped.set(ingredient.category, category)
    })
  })
  manualShoppingItems
    .filter((item) => selectedManualShoppingIds.includes(item.id))
    .forEach((item) => {
      const category = grouped.get(item.section) ?? new Map()
      const selectionCount = selectedManualShoppingQuantities[item.id] ?? 1
      category.set(`manual:${item.id}`, {
        id: `manual:${item.id}`,
        name: item.name,
        quantity: item.quantity === undefined ? undefined : item.quantity * selectionCount,
        unit: item.unit,
      })
      grouped.set(item.section, category)
    })
  return grouped
}

const renderShoppingList = (showWarnings = true) => {
  const grouped = aggregateIngredients()
  if (!plannedRecipes.length && !selectedManualShoppingIds.length) {
    return `<div class="empty-state"><span class="empty-icon">✦</span><h3>Your list is empty</h3><p>Add recipes to your week and your combined shopping list will appear here.</p></div>`
  }
  const planned = plannedRecipes.map(({ recipeId }) => getRecipe(recipeId)).filter((recipe): recipe is Recipe => Boolean(recipe))
  const conflicts = findIngredientConflicts(planned)
  const conflictWarning = showWarnings && conflicts.length
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
  return `${conflictWarning}${shoppingSections()
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
                  <input type="checkbox" data-bought-shopping-item="${escapeHtml(item.id)}" ${boughtShoppingItemIds.includes(item.id) ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  <span>${escapeHtml(item.name)}</span>
                  ${item.quantity === undefined ? '' : `<strong>${formatQuantity(item.quantity)} ${escapeHtml(item.unit ?? '')}</strong>`}
                </label>
              `,
            )
            .join('')}
        </section>
      `,
    )
    .join('')}`
}

const renderShoppingItemsView = () => `
  <section class="section-header">
    <div><div class="eyebrow">REUSABLE ITEMS</div><h2>Shopping items</h2></div>
  </section>
  <div class="shopping-items-layout">
    <section class="shopping-items-manager">
      <p class="panel-intro">Add regular items once, then select them whenever you need them on your shopping list.</p>
      <form class="manual-shopping-form" id="manual-shopping-form">
        <input name="item" type="text" placeholder="Milk, bread, ready meals..." aria-label="Shopping item" required>
        <input name="quantity" type="number" min="0.01" step="any" placeholder="Qty" aria-label="Quantity">
        <input name="unit" type="text" placeholder="Unit" aria-label="Unit">
        <select id="manual-shopping-section" name="section" aria-label="Shopping section">${shoppingSections()
          .map((section) => `<option value="${escapeHtml(section)}">${escapeHtml(section)}</option>`)
          .join('')}<option value="__new__">＋ New section</option></select>
        <input name="new-section" type="text" placeholder="New section name" aria-label="New section name" hidden>
        <button type="submit" class="outline-button">Add item</button>
      </form>
      ${
        manualShoppingItems.length
          ? `<div class="shopping-items-actions"><button type="button" class="text-button" data-select-all-shopping-items>Select all</button><button type="button" class="text-button" data-unselect-all-shopping-items>Unselect all</button></div><input type="search" id="manual-shopping-search" class="shopping-items-search" placeholder="Search saved items..." aria-label="Search saved shopping items" value="${escapeHtml(manualShoppingSearch)}"><p class="panel-intro" id="manual-shopping-no-match" hidden>No saved items match your search.</p>` +
            shoppingSections()
              .filter((section) => manualShoppingItems.some((item) => item.section === section))
              .map(
                (section) => `
                  <div data-shopping-items-group>
                  <h3 class="shopping-items-section">${escapeHtml(section)}</h3>
                  <ul class="shopping-items-catalog">${manualShoppingItems
                    .filter((item) => item.section === section)
                    .sort((first, second) => first.name.localeCompare(second.name))
                    .map(
                      (item) => `
                        <li data-search-name="${escapeHtml(item.name.toLowerCase())}">
                          <label>
                            <input type="checkbox" data-manual-shopping-toggle="${escapeHtml(item.id)}" ${selectedManualShoppingIds.includes(item.id) ? 'checked' : ''}>
                            <span>${escapeHtml(item.name)}</span>
                            <small>${item.quantity === undefined ? '' : `${formatQuantity(item.quantity)} ${escapeHtml(item.unit ?? '')}`}</small>
                            <input type="number" min="1" step="1" value="${selectedManualShoppingQuantities[item.id] ?? 1}" data-manual-shopping-quantity="${escapeHtml(item.id)}" aria-label="Quantity of ${escapeHtml(item.name)}" ${selectedManualShoppingIds.includes(item.id) ? '' : 'disabled'}>
                          </label>
                          <button type="button" class="delete-button" data-delete-manual-shopping-item="${escapeHtml(item.id)}">Delete</button>
                        </li>
                      `,
                    )
                    .join('')}</ul>
                  </div>
                `,
              )
              .join('')
          : '<div class="empty-state"><span class="empty-icon">✦</span><h3>No saved shopping items</h3><p>Add regular items here for quick reselection.</p></div>'
      }
    </section>
    <aside class="shopping-panel">
      <div class="panel-header"><div><div class="eyebrow">CURRENT LIST</div><h2>Shopping list</h2></div></div>
      <p class="panel-intro">Ingredients and selected regular items for your week.</p>
      ${renderShoppingList()}
    </aside>
  </div>
`

const renderAuthScreen = () => {
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <div class="eyebrow">OPERATION FISH FOR LIFE</div>
        <h1>${authMode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h1>
        <p>${authMode === 'sign-in' ? 'Sign in to access your household meal planner.' : 'Create an account to sync your planner across devices.'}</p>
        ${authError ? `<p class="form-error">${escapeHtml(authError)}</p>` : ''}
        <form id="auth-form">
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Password<input name="password" type="password" minlength="8" autocomplete="${authMode === 'sign-in' ? 'current-password' : 'new-password'}" required></label>
          <button type="submit" class="outline-button">${authMode === 'sign-in' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button type="button" class="text-button" data-toggle-auth>
          ${authMode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  `
  document.querySelector<HTMLFormElement>('#auth-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    authError = ''
    try {
      if (authMode === 'sign-in') {
        await signIn(email, password)
        await startApp()
      } else {
        const result = await signUp(email, password)
        if (!result.session) {
          authError = 'Account created. Check your email to confirm it, then sign in.'
          renderAuthScreen()
        } else {
          await startApp()
        }
      }
    } catch (error) {
      authError = error instanceof Error ? error.message : 'Unable to authenticate.'
      renderAuthScreen()
    }
  })
  document.querySelector<HTMLElement>('[data-toggle-auth]')?.addEventListener('click', () => {
    authMode = authMode === 'sign-in' ? 'sign-up' : 'sign-in'
    authError = ''
    renderAuthScreen()
  })
}

const renderHouseholdSetup = () => {
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <div class="eyebrow">HOUSEHOLD SETUP</div>
        <h1>Connect your household</h1>
        <p>Create a household or join one using an invite code. Household members share recipes, plans, and shopping items.</p>
        ${authError ? `<p class="form-error">${escapeHtml(authError)}</p>` : ''}
        <form id="create-household-form">
          <label>New household name<input name="name" placeholder="The Malone household" required></label>
          <button type="submit" class="outline-button">Create household</button>
        </form>
        <div class="auth-divider">OR</div>
        <form id="join-household-form">
          <label>Invite code<input name="code" autocapitalize="characters" placeholder="AB12CD34EF" required></label>
          <button type="submit" class="outline-button">Join household</button>
        </form>
        <button type="button" class="text-button" data-sign-out>Sign out</button>
      </section>
    </main>
  `
  document.querySelector<HTMLFormElement>('#create-household-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const name = ((form.elements.namedItem('name') as HTMLInputElement).value).trim()
    authError = ''
    try {
      await createHousehold(name)
      await startApp()
    } catch (error) {
      authError = error instanceof Error ? error.message : 'Unable to create the household.'
      renderHouseholdSetup()
    }
  })
  document.querySelector<HTMLFormElement>('#join-household-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const code = ((form.elements.namedItem('code') as HTMLInputElement).value).trim()
    authError = ''
    try {
      await joinHousehold(code)
      await startApp()
    } catch (error) {
      authError = error instanceof Error ? error.message : 'Unable to join the household.'
      renderHouseholdSetup()
    }
  })
  document.querySelector<HTMLElement>('[data-sign-out]')?.addEventListener('click', async () => {
    await signOut()
    await startApp()
  })
}

const render = () => {
  const totalServings = plannedRecipes.reduce((total, item) => total + item.servings, 0)
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#"><span class="brand-mark">✦</span><span>Operation Fish for Life</span></a>
      <nav>
        <button class="${activeView === 'list' ? 'active' : ''}" data-view="list">Shopping list</button>
        <button class="${activeView === 'plan' ? 'active' : ''}" data-view="plan">Weekly plan</button>
        <button class="${activeView === 'recipes' ? 'active' : ''}" data-view="recipes">My recipes</button>
        <button class="${activeView === 'shopping' ? 'active' : ''}" data-view="shopping">Shopping items</button>
      </nav>
      <div class="topbar-actions"><div class="account-menu"><button type="button" class="avatar" data-account-menu aria-haspopup="menu" aria-expanded="${isAccountMenuOpen}">${escapeHtml((currentUser?.email?.charAt(0) ?? 'U').toUpperCase())}</button><div class="account-dropdown ${isAccountMenuOpen ? 'is-open' : ''}" role="menu"><div class="account-label">${escapeHtml(currentUser?.email ?? 'ACCOUNT')}</div><div class="account-label">${escapeHtml(currentHousehold?.name ?? '')} · ${escapeHtml(currentHousehold?.invite_code ?? '')}</div><button type="button" class="dropdown-action" data-export-recipes>Export backup</button><label class="dropdown-action">Import backup<input id="recipe-backup" type="file" accept=".json,application/json"></label><button type="button" class="dropdown-action" data-sign-out>Sign out</button></div></div></div>
    </header>
    <main>
      ${
        activeView === 'list'
          ? `<div class="eyebrow trip-week">WEEK OF ${selectedWeekLabel().toUpperCase()}</div><div class="trip-list">${renderShoppingList(false)}</div>`
          : ''
      }
      <section class="hero" ${activeView === 'list' ? 'hidden' : ''}>
        <div>
          <div class="week-heading"><button type="button" class="week-nav-button" data-week-previous aria-label="Previous week">←</button><div class="eyebrow">WEEK OF ${selectedWeekLabel().toUpperCase()}</div><button type="button" class="week-nav-button" data-week-next aria-label="Next week">→</button><button type="button" class="outline-button next-week-button" data-default-week>Next week's menu →</button></div>
          <p>Choose your meals for the week and we’ll take care of the shopping list.</p>
        </div>
        <div class="week-summary"><span class="summary-label">${selectedWeekStart === defaultWeekStart ? 'NEXT WEEK' : 'PLANNED WEEK'}</span><strong>${plannedRecipes.length} <small>meals</small></strong><span>${totalServings} servings planned</span></div>
      </section>
      ${
        activeView === 'list'
          ? ''
          : activeView === 'recipes'
          ? (() => {
              const filteredRecipes = recipes.filter((recipe) => recipeMatchesSearch(recipe, recipeSearchTerm))
              return `<section class="section-header"><div><div class="eyebrow">YOUR COLLECTION</div><h2>Recipes to cook</h2></div><div class="recipe-actions"><input class="recipe-search" id="recipe-search" type="search" value="${escapeHtml(recipeSearchTerm)}" placeholder="Search recipes"><button class="outline-button" data-new-recipe>＋ New recipe</button></div></section>
             ${filteredRecipes.length ? `<section class="recipe-grid">${filteredRecipes.map(renderRecipeCard).join('')}</section>` : '<div class="empty-state recipe-no-results"><span class="empty-icon">⌕</span><h3>No recipes found</h3><p>Try a different name, ingredient, tag, or category.</p></div>'}`
            })()
          : activeView === 'shopping'
            ? renderShoppingItemsView()
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
                <div class="panel-header"><div><h2>Shopping list</h2></div><button class="print-button" onclick="window.print()">Print</button></div>
                <div class="print-meals"><strong>Meals</strong><ul>${plannedRecipes
                  .map(({ recipeId }) => getRecipe(recipeId)?.name)
                  .filter((name): name is string => Boolean(name))
                  .map((name) => `<li>${escapeHtml(name)}</li>`)
                  .join('')}</ul></div>
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
  document.querySelector<HTMLButtonElement>('[data-week-previous]')?.addEventListener('click', () => void changeSelectedWeek(-1))
  document.querySelector<HTMLButtonElement>('[data-week-next]')?.addEventListener('click', () => void changeSelectedWeek(1))
  document.querySelector<HTMLButtonElement>('[data-default-week]')?.addEventListener('click', () => void returnToDefaultWeek())
  document.querySelectorAll<HTMLElement>('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      activeView = button.dataset.view as 'plan' | 'recipes' | 'shopping' | 'list'
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
  document.querySelector<HTMLFormElement>('#manual-shopping-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const input = form.elements.namedItem('item') as HTMLInputElement
    const name = input.value.trim()
    if (!name) return
    const quantityInput = form.elements.namedItem('quantity') as HTMLInputElement
    const unitInput = form.elements.namedItem('unit') as HTMLInputElement
    const quantityValue = quantityInput.value.trim()
    const quantity = quantityValue ? Number(quantityValue) : undefined
    if (quantityValue && (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0)) return
    const unit = unitInput.value.trim()
    const sectionSelect = form.elements.namedItem('section') as HTMLSelectElement
    const newSectionInput = form.elements.namedItem('new-section') as HTMLInputElement
    let section = sectionSelect.value
    if (section === '__new__') {
      section = newSectionInput.value.trim()
      if (!section) return
      if (!shoppingSections().some((existingSection) => existingSection.toLowerCase() === section.toLowerCase())) {
        manualShoppingSections = [...manualShoppingSections, section]
        await saveShoppingSection(section)
        mirrorShoppingSections()
      } else {
        section = shoppingSections().find((existingSection) => existingSection.toLowerCase() === section.toLowerCase())!
      }
    }
    const existing = manualShoppingItems.find((item) => item.name.toLowerCase() === name.toLowerCase())
    const item = existing
      ? { ...existing, quantity: quantity ?? existing.quantity, unit: unit || existing.unit }
      : { id: crypto.randomUUID(), name, section, quantity, unit }
    manualShoppingItems = existing
      ? manualShoppingItems.map((savedItem) => (savedItem.id === existing.id ? item : savedItem))
      : [...manualShoppingItems, item]
    if (!selectedManualShoppingIds.includes(item.id)) {
      selectedManualShoppingIds = [...selectedManualShoppingIds, item.id]
      selectedManualShoppingQuantities[item.id] = 1
    }
    await saveShoppingItem(item)
    mirrorShoppingItems()
    saveManualShoppingSelection()
    render()
  })
  const applyManualShoppingSearch = () => {
    const query = manualShoppingSearch.trim().toLowerCase()
    let visibleCount = 0
    document.querySelectorAll<HTMLElement>('[data-shopping-items-group]').forEach((group) => {
      let groupVisible = 0
      group.querySelectorAll<HTMLElement>('li[data-search-name]').forEach((row) => {
        const match = !query || row.dataset.searchName!.includes(query)
        row.hidden = !match
        if (match) groupVisible += 1
      })
      group.hidden = groupVisible === 0
      visibleCount += groupVisible
    })
    const noMatch = document.querySelector<HTMLElement>('#manual-shopping-no-match')
    if (noMatch) noMatch.hidden = visibleCount > 0
  }
  applyManualShoppingSearch()
  document.querySelector<HTMLInputElement>('#manual-shopping-search')?.addEventListener('input', (event) => {
    manualShoppingSearch = (event.currentTarget as HTMLInputElement).value
    applyManualShoppingSearch()
  })
  document.querySelector<HTMLButtonElement>('[data-select-all-shopping-items]')?.addEventListener('click', () => {
    selectedManualShoppingIds = manualShoppingItems.map((item) => item.id)
    manualShoppingItems.forEach((item) => {
      selectedManualShoppingQuantities[item.id] = selectedManualShoppingQuantities[item.id] ?? 1
    })
    saveManualShoppingSelection()
    render()
  })
  document.querySelector<HTMLButtonElement>('[data-unselect-all-shopping-items]')?.addEventListener('click', () => {
    selectedManualShoppingIds = []
    saveManualShoppingSelection()
    render()
  })
  document.querySelector<HTMLSelectElement>('#manual-shopping-section')?.addEventListener('change', (event) => {
    const select = event.currentTarget as HTMLSelectElement
    const newSectionInput = document.querySelector<HTMLInputElement>('#manual-shopping-form input[name="new-section"]')
    const isNewSection = select.value === '__new__'
    if (newSectionInput) {
      newSectionInput.hidden = !isNewSection
      newSectionInput.required = isNewSection
      if (!isNewSection) newSectionInput.value = ''
    }
  })
  document.querySelectorAll<HTMLInputElement>('[data-manual-shopping-toggle]').forEach((input) => {
    input.addEventListener('change', () => {
      const itemId = input.dataset.manualShoppingToggle!
      selectedManualShoppingIds = input.checked
        ? [...selectedManualShoppingIds, itemId]
        : selectedManualShoppingIds.filter((id) => id !== itemId)
      if (input.checked) selectedManualShoppingQuantities[itemId] = selectedManualShoppingQuantities[itemId] ?? 1
      saveManualShoppingSelection()
      render()
    })
  })
  document.querySelectorAll<HTMLInputElement>('[data-manual-shopping-quantity]').forEach((input) => {
    input.addEventListener('change', () => {
      const itemId = input.dataset.manualShoppingQuantity!
      const quantity = Number(input.value)
      if (!Number.isInteger(quantity) || quantity < 1) {
        input.value = String(selectedManualShoppingQuantities[itemId] ?? 1)
        return
      }
      selectedManualShoppingQuantities[itemId] = quantity
      saveManualShoppingSelection()
      render()
    })
  })
  document.querySelectorAll<HTMLInputElement>('[data-bought-shopping-item]').forEach((input) => {
    input.addEventListener('change', async () => {
      const itemId = input.dataset.boughtShoppingItem!
      boughtShoppingItemIds = input.checked
        ? [...new Set([...boughtShoppingItemIds, itemId])]
        : boughtShoppingItemIds.filter((id) => id !== itemId)
      await saveBoughtShoppingItems()
      render()
    })
  })
  document.querySelectorAll<HTMLElement>('[data-delete-manual-shopping-item]').forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = button.dataset.deleteManualShoppingItem!
      manualShoppingItems = manualShoppingItems.filter((item) => item.id !== itemId)
      selectedManualShoppingIds = selectedManualShoppingIds.filter((id) => id !== itemId)
      delete selectedManualShoppingQuantities[itemId]
      boughtShoppingItemIds = boughtShoppingItemIds.filter((id) => id !== `manual:${itemId}`)
      await deleteShoppingItem(itemId)
      mirrorShoppingItems()
      saveManualShoppingSelection()
      render()
    })
  })
  document.querySelector<HTMLButtonElement>('[data-account-menu]')?.addEventListener('click', () => {
    isAccountMenuOpen = !isAccountMenuOpen
    const button = document.querySelector<HTMLButtonElement>('[data-account-menu]')
    const dropdown = document.querySelector<HTMLDivElement>('.account-dropdown')
    button?.setAttribute('aria-expanded', String(isAccountMenuOpen))
    dropdown?.classList.toggle('is-open', isAccountMenuOpen)
  })
  document.querySelector<HTMLButtonElement>('[data-sign-out]')?.addEventListener('click', async () => {
    await signOut()
    await startApp()
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

const loadHouseholdData = async () => {
  recipes = await initializeRecipes()
  await loadSelectedWeekPlan()
  const storedShoppingItems = await listShoppingItems()
  if (!storedShoppingItems.length && legacyManualShoppingItems.length) {
    await Promise.all(legacyManualShoppingItems.map((item) => saveShoppingItem(item)))
  }
  manualShoppingItems = await listShoppingItems()
  selectedManualShoppingIds = selectedManualShoppingIds.filter((id) => manualShoppingItems.some((item) => item.id === id))
  const storedShoppingSections = await listShoppingSections()
  if (!storedShoppingSections.length && manualShoppingSections.length) {
    await Promise.all(manualShoppingSections.map((section) => saveShoppingSection(section)))
  }
  manualShoppingSections = await listShoppingSections()
  if (!loadedWeeklyPlanFromRemote && !savedManualShoppingSelection && legacyManualShoppingItems.length) {
    selectedManualShoppingIds = legacyManualShoppingItems.map((item) => item.id)
    saveManualShoppingSelection()
  }
  mirrorShoppingItems()
  mirrorShoppingSections()
  const recipeIds = new Set(recipes.map((recipe) => recipe.id))
  const validPlan = plannedRecipes.filter((item) => recipeIds.has(item.recipeId))
  if (validPlan.length !== plannedRecipes.length) {
    plannedRecipes = validPlan
    savePlan()
  }
  render()
}

const startApp = async () => {
  try {
    const session = await getSession()
    if (!session) {
      currentUser = null
      currentHousehold = null
      setActiveHousehold(null)
      renderAuthScreen()
      return
    }
    currentUser = session.user
    const households = await listHouseholds(currentUser)
    if (!households.length) {
      currentHousehold = null
      setActiveHousehold(null)
      renderHouseholdSetup()
      return
    }
    currentHousehold = households[0]
    setActiveHousehold(currentHousehold.id)
    await loadHouseholdData()
  } catch (error) {
    authError = error instanceof Error ? error.message : 'Unable to load the account.'
    renderAuthScreen()
  }
}

void startApp()
