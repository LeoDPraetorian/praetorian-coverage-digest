/**
 * Zustand Store with Selector Patterns (v5)
 *
 * Use when:
 * - Need to select multiple values without infinite loops
 * - Want auto-generated selectors for cleaner code
 * - Need derived/computed state
 *
 * CRITICAL: Zustand v5 requires stable selector outputs!
 * Use useShallow when selecting multiple values.
 *
 * Learn more: See references/selectors-guide.md
 */

import { create, StoreApi, UseBoundStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// ============================================
// Part 1: Basic Store
// ============================================

interface Bear {
  id: string
  name: string
  location: string
}

interface BearStore {
  bears: Bear[]
  honey: number
  isHibernating: boolean
  addBear: (bear: Bear) => void
  removeHoney: (amount: number) => void
  toggleHibernation: () => void
}

const useBearStoreBase = create<BearStore>()((set) => ({
  bears: [],
  honey: 100,
  isHibernating: false,

  addBear: (bear) => set((state) => ({ bears: [...state.bears, bear] })),
  removeHoney: (amount) =>
    set((state) => ({ honey: Math.max(0, state.honey - amount) })),
  toggleHibernation: () =>
    set((state) => ({ isHibernating: !state.isHibernating })),
}))

// ============================================
// Part 2: Auto-Generated Selectors Pattern
// ============================================

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(
  _store: S
) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }
  return store
}

// Wrap store with auto-generated selectors
export const useBearStore = createSelectors(useBearStoreBase)

// ============================================
// Part 3: Usage Examples
// ============================================

/**
 * Example 1: Auto-generated selectors (cleanest API)
 *
 * function BearStats() {
 *   // One line per value - no selector function needed!
 *   const honey = useBearStore.use.honey()
 *   const isHibernating = useBearStore.use.isHibernating()
 *   const toggleHibernation = useBearStore.use.toggleHibernation()
 *
 *   return (
 *     <div>
 *       <p>Honey: {honey}</p>
 *       <p>Hibernating: {isHibernating ? 'Yes' : 'No'}</p>
 *       <button onClick={toggleHibernation}>Toggle</button>
 *     </div>
 *   )
 * }
 */

/**
 * Example 2: Multiple values with useShallow (REQUIRED in v5 for objects/arrays)
 *
 * function BearDashboard() {
 *   // ❌ WRONG - Creates new object every render, causes infinite loop!
 *   // const { honey, isHibernating } = useBearStore((state) => ({
 *   //   honey: state.honey,
 *   //   isHibernating: state.isHibernating,
 *   // }))
 *
 *   // ✅ CORRECT - useShallow prevents infinite loops
 *   const { honey, isHibernating } = useBearStore(
 *     useShallow((state) => ({
 *       honey: state.honey,
 *       isHibernating: state.isHibernating,
 *     }))
 *   )
 *
 *   // ✅ Also correct - Array destructuring with useShallow
 *   const [bears, addBear] = useBearStore(
 *     useShallow((state) => [state.bears, state.addBear])
 *   )
 *
 *   return (
 *     <div>
 *       <p>Honey: {honey}</p>
 *       <p>Bears: {bears.length}</p>
 *     </div>
 *   )
 * }
 */

/**
 * Example 3: Derived/computed values
 *
 * function BearReport() {
 *   // Derived value - calculated in selector, not stored
 *   const totalBears = useBearStore((state) => state.bears.length)
 *   const honeyPerBear = useBearStore((state) =>
 *     state.bears.length > 0 ? state.honey / state.bears.length : 0
 *   )
 *
 *   return (
 *     <div>
 *       <p>Total bears: {totalBears}</p>
 *       <p>Honey per bear: {honeyPerBear.toFixed(1)}</p>
 *     </div>
 *   )
 * }
 */

/**
 * Example 4: Parameterized selector
 *
 * const selectBearById = (id: string) => (state: BearStore) =>
 *   state.bears.find((bear) => bear.id === id)
 *
 * function BearCard({ bearId }: { bearId: string }) {
 *   const bear = useBearStore(selectBearById(bearId))
 *
 *   if (!bear) return <div>Bear not found</div>
 *   return <div>{bear.name} at {bear.location}</div>
 * }
 */

/**
 * Example 5: Mapped values with useShallow
 *
 * function BearLocations() {
 *   // Get unique locations from bears array
 *   const locations = useBearStore(
 *     useShallow((state) => [...new Set(state.bears.map((b) => b.location))])
 *   )
 *
 *   return (
 *     <ul>
 *       {locations.map((loc) => <li key={loc}>{loc}</li>)}
 *     </ul>
 *   )
 * }
 */
