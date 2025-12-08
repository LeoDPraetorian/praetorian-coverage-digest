# Design Patterns

Architectural patterns for React applications: MVC, MVVM, Flux, Observer, Factory, and Module patterns.

## MVC (Model-View-Controller)

```typescript
// Model - Business logic
class UserModel {
  constructor(public id: string, public name: string) {}
  
  validate(): boolean {
    return this.name.length > 0;
  }
}

// View - UI Component
function UserView({ user, onUpdate }: { user: UserModel; onUpdate: (name: string) => void }) {
  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => onUpdate('New Name')}>Update</button>
    </div>
  );
}

// Controller - Logic coordinator
function UserController() {
  const [user, setUser] = useState(new UserModel('1', 'John'));
  
  const handleUpdate = (name: string) => {
    const updated = new UserModel(user.id, name);
    if (updated.validate()) {
      setUser(updated);
    }
  };
  
  return <UserView user={user} onUpdate={handleUpdate} />;
}
```

## MVVM (Model-View-ViewModel)

```typescript
// ViewModel - State + Logic
function useUserViewModel(userId: string) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<User>) => updateUser(userId, data),
  });
  
  return {
    user,
    updateUser: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// View
function UserProfile({ userId }: { userId: string }) {
  const { user, updateUser, isUpdating } = useUserViewModel(userId);
  
  return (
    <div>
      <h1>{user?.name}</h1>
      <button onClick={() => updateUser({ name: 'New Name' })} disabled={isUpdating}>
        Update
      </button>
    </div>
  );
}
```

## Flux Pattern (Redux/Zustand)

```typescript
// Store
const useStore = create<State>((set) => ({
  users: [],
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  removeUser: (id) => set((state) => ({ 
    users: state.users.filter(u => u.id !== id) 
  })),
}));

// Component
function UserList() {
  const users = useStore((state) => state.users);
  const addUser = useStore((state) => state.addUser);
  
  return (
    <div>
      {users.map(user => <UserCard key={user.id} user={user} />)}
      <button onClick={() => addUser({ id: '123', name: 'New User' })}>
        Add User
      </button>
    </div>
  );
}
```

## Observer Pattern (Event Emitter)

```typescript
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();
  
  on(event: string, listener: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
  }
  
  emit(event: string, ...args: any[]) {
    this.events.get(event)?.forEach(listener => listener(...args));
  }
}

// Usage
const emitter = new EventEmitter();

function ComponentA() {
  useEffect(() => {
    const handler = (data: any) => console.log(data);
    emitter.on('userUpdated', handler);
    return () => emitter.off('userUpdated', handler);
  }, []);
}

function ComponentB() {
  const handleUpdate = () => {
    emitter.emit('userUpdated', { id: '123', name: 'Updated' });
  };
}
```

## Factory Pattern

```typescript
interface Component {
  render(): JSX.Element;
}

class ButtonFactory {
  createButton(type: 'primary' | 'secondary' | 'danger'): Component {
    switch (type) {
      case 'primary':
        return new PrimaryButton();
      case 'secondary':
        return new SecondaryButton();
      case 'danger':
        return new DangerButton();
    }
  }
}

// React equivalent (simpler)
function createButton(type: 'primary' | 'secondary' | 'danger') {
  const styles = {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-200 text-gray-900',
    danger: 'bg-red-600 text-white',
  };
  
  return (props: ButtonProps) => (
    <button className={styles[type]} {...props} />
  );
}
```

## Module Pattern

```typescript
// Module encapsulation
const AuthModule = (() => {
  let currentUser: User | null = null;
  
  return {
    login: async (email: string, password: string) => {
      currentUser = await loginAPI(email, password);
    },
    logout: () => {
      currentUser = null;
    },
    getCurrentUser: () => currentUser,
  };
})();

// ES6 modules (preferred)
export class AuthService {
  private currentUser: User | null = null;
  
  async login(email: string, password: string) {
    this.currentUser = await loginAPI(email, password);
  }
  
  logout() {
    this.currentUser = null;
  }
  
  getCurrentUser() {
    return this.currentUser;
  }
}
```

## Related References

- [React 19 Patterns](react-19-patterns.md) - Component patterns
- [State Management](state-management.md) - Flux pattern with Zustand
