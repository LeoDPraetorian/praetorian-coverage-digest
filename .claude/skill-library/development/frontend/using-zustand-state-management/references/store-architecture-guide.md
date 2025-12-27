# Store Architecture Decision Guide

## Store Architecture Decision Tree

**CRITICAL**: Before creating stores, decide on architecture. This is the most important decision.

```
Is your state isolated (never needs to interact with other state)?
├── YES → Use MULTIPLE SEPARATE STORES (simpler, better isolation)
│         Example: useAuthStore, useUIStore, usePreferencesStore
│
└── NO → Does state need cross-store derived values or coordinated updates?
         ├── YES → Use SINGLE STORE (with or without logical grouping)
         │         Consider: Extract action logic to separate files, not slices
         │
         └── MAYBE → Start with MULTIPLE STORES, merge later if needed
                     (Merging stores is easier than splitting them)
```

## When to Use Multiple Stores (Recommended Default)

```typescript
// ✅ PREFERRED: Separate stores for isolated concerns
const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

const useUIStore = create<UIStore>()((set) => ({
  sidebarOpen: true,
  theme: "dark",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

const usePreferencesStore = create<PreferencesStore>()(
  persist((set) => ({ language: "en", setLanguage: (l) => set({ language: l }) }), {
    name: "preferences",
  })
);
```

**Benefits**: Simpler types, better code splitting, clearer ownership, easier testing.

## When to Use Single Store

- State needs **cross-domain derived values** (hard with multiple stores)
- Actions must **update multiple domains atomically**
- You need **single middleware instance** (one persist, one devtools)

```typescript
// Single store when domains are interdependent
const useAppStore = create<AppStore>()((set, get) => ({
  // Auth domain
  user: null,
  login: (user) => set({ user }),

  // Preferences domain (depends on user)
  preferences: {},
  loadUserPreferences: async () => {
    const user = get().user;
    if (!user) return;
    const prefs = await fetchPrefs(user.id);
    set({ preferences: prefs });
  },
}));
```

## Why NOT Slices Pattern (Usually)

The slices pattern is **complex and error-prone** with TypeScript:

| Issue                                        | Impact                                |
| -------------------------------------------- | ------------------------------------- |
| `StateCreator` requires 4 generic parameters | Complex, hard to understand           |
| Each slice must know the combined type       | Tight coupling, circular dependencies |
| Middleware can't be per-slice                | Must wrap entire store                |
| Cross-slice access requires full type        | Defeats isolation purpose             |
| TypeScript errors are cryptic                | Hard to debug                         |

**Use slices only when**: You have a genuinely massive store AND concerns are interdependent AND you've tried multiple stores first.

## Slices Pattern Implementation

**If you must use slices** (interdependent state, single middleware requirement):

```typescript
import { create, StateCreator } from "zustand";

interface BearSlice {
  bears: number;
  addBear: () => void;
}

interface FishSlice {
  fishes: number;
  addFish: () => void;
}

// ⚠️ Each slice must know the COMBINED type - this is the pain point
const createBearSlice: StateCreator<
  BearSlice & FishSlice, // Combined store type (ALL slices)
  [], // Middleware mutators
  [], // Chained middleware
  BearSlice // This slice's type
> = (set) => ({
  bears: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
});

const useStore = create<BearSlice & FishSlice>()((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));
```

**Why this is painful**:

- Each slice must import the combined type → circular dependency risk
- Adding a new slice requires updating ALL slice type parameters
- TypeScript errors are cryptic when types don't align
- Middleware must wrap the combined store, not individual slices

**Third-party alternative**: [zustand-slices](https://github.com/zustandjs/zustand-slices) library simplifies typing

## Related

- [Main Skill](../SKILL.md) - Complete Zustand patterns and setup
- [Store Organization Patterns](store-organization-patterns.md) - Refactoring strategies
