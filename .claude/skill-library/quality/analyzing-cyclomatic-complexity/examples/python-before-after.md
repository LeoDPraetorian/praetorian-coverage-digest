# Python Refactoring Examples

Real-world refactorings reducing cyclomatic complexity in Python CLI and backend code.

## Example 1: CLI Command with Many Options

### Before (Complexity: 12)

```python
def process_asset(asset_id, scan_type, priority, notify, export, format):
    """Process asset with various options."""
    asset = get_asset(asset_id)

    if not asset:
        print("Asset not found")
        return

    if asset.status == "archived":
        print("Asset is archived")
        return

    if scan_type == "full":
        if priority == "high":
            result = run_high_priority_full_scan(asset)
        else:
            result = run_full_scan(asset)
    elif scan_type == "quick":
        if priority == "high":
            result = run_high_priority_quick_scan(asset)
        else:
            result = run_quick_scan(asset)
    else:
        print(f"Unknown scan type: {scan_type}")
        return

    if notify:
        if result.critical_findings:
            send_urgent_notification(asset, result)
        else:
            send_notification(asset, result)

    if export:
        if format == "json":
            export_json(result)
        elif format == "csv":
            export_csv(result)
        elif format == "pdf":
            export_pdf(result)
```

### After (Complexity: 2 per function)

```python
def process_asset(asset_id, scan_type, priority, notify, export, format):
    """Process asset with various options."""
    asset = get_asset(asset_id)
    if not asset:
        print("Asset not found")
        return

    if asset.status == "archived":
        print("Asset is archived")
        return

    result = run_scan(asset, scan_type, priority)
    if result:
        handle_notifications(asset, result, notify)
        handle_export(result, export, format)

# Complexity: 2

def run_scan(asset, scan_type, priority):
    """Run appropriate scan based on type and priority."""
    scanners = {
        ('full', 'high'): run_high_priority_full_scan,
        ('full', 'normal'): run_full_scan,
        ('quick', 'high'): run_high_priority_quick_scan,
        ('quick', 'normal'): run_quick_scan,
    }

    scanner = scanners.get((scan_type, priority))
    if not scanner:
        print(f"Unknown scan type: {scan_type}")
        return None

    return scanner(asset)

# Complexity: 1

def handle_notifications(asset, result, should_notify):
    """Send notifications based on results."""
    if not should_notify:
        return

    if result.critical_findings:
        send_urgent_notification(asset, result)
    else:
        send_notification(asset, result)

# Complexity: 2

def handle_export(result, should_export, format):
    """Export results in specified format."""
    if not should_export:
        return

    exporters = {
        'json': export_json,
        'csv': export_csv,
        'pdf': export_pdf,
    }

    exporter = exporters.get(format)
    if exporter:
        exporter(result)

# Complexity: 1
```

**Improvements:**
- Dictionary dispatch eliminates nested if/elif
- Separate concerns: scanning, notification, export
- Easy to add new scan types or export formats

---

## Example 2: Data Validation with Many Rules

### Before (Complexity: 14)

```python
def validate_seed_data(data):
    """Validate seed data before creation."""
    errors = []

    if not data.get('name'):
        errors.append("Name is required")
    else:
        if len(data['name']) < 3:
            errors.append("Name too short")
        if len(data['name']) > 100:
            errors.append("Name too long")

    if not data.get('value'):
        errors.append("Value is required")
    else:
        if data.get('type') == 'domain':
            if not is_valid_domain(data['value']):
                errors.append("Invalid domain format")
        elif data.get('type') == 'ip':
            if not is_valid_ip(data['value']):
                errors.append("Invalid IP format")
        elif data.get('type') == 'cidr':
            if not is_valid_cidr(data['value']):
                errors.append("Invalid CIDR format")
        else:
            errors.append("Unknown seed type")

    if data.get('tags'):
        if not isinstance(data['tags'], list):
            errors.append("Tags must be a list")
        else:
            if len(data['tags']) > 10:
                errors.append("Too many tags (max 10)")

    return errors
```

### After (Complexity: 3 per validator)

```python
def validate_seed_data(data):
    """Validate seed data before creation."""
    validators = [
        validate_name,
        validate_value,
        validate_type,
        validate_tags,
    ]

    errors = []
    for validator in validators:
        error = validator(data)
        if error:
            errors.extend(error if isinstance(error, list) else [error])

    return errors

# Complexity: 2

def validate_name(data):
    """Validate seed name."""
    name = data.get('name')

    if not name:
        return ["Name is required"]

    errors = []
    if len(name) < 3:
        errors.append("Name too short (min 3 chars)")
    if len(name) > 100:
        errors.append("Name too long (max 100 chars)")

    return errors

# Complexity: 3

def validate_value(data):
    """Validate seed value."""
    if not data.get('value'):
        return ["Value is required"]
    return []

# Complexity: 1

TYPE_VALIDATORS = {
    'domain': is_valid_domain,
    'ip': is_valid_ip,
    'cidr': is_valid_cidr,
}

def validate_type(data):
    """Validate seed type and value format."""
    seed_type = data.get('type')
    value = data.get('value')

    if not value:
        return []  # Already validated by validate_value

    validator = TYPE_VALIDATORS.get(seed_type)
    if not validator:
        return ["Unknown seed type"]

    if not validator(value):
        return [f"Invalid {seed_type} format"]

    return []

# Complexity: 3

def validate_tags(data):
    """Validate tags field."""
    tags = data.get('tags')

    if not tags:
        return []

    if not isinstance(tags, list):
        return ["Tags must be a list"]

    if len(tags) > 10:
        return ["Too many tags (max 10)"]

    return []

# Complexity: 3
```

**Improvements:**
- Composable validators
- Dictionary dispatch for type validation
- Each validator independently testable
- Clear error messages

---

## Example 3: API Response Processing

### Before (Complexity: 11)

```python
def process_api_response(response):
    """Process API response and handle various cases."""
    if response.status_code == 200:
        data = response.json()
        if 'error' in data:
            raise Exception(data['error'])
        if 'result' in data:
            if 'id' in data['result']:
                return data['result']
            else:
                raise Exception("Missing result ID")
        else:
            raise Exception("Missing result field")
    elif response.status_code == 404:
        raise Exception("Resource not found")
    elif response.status_code == 403:
        raise Exception("Access denied")
    elif response.status_code == 429:
        raise Exception("Rate limit exceeded")
    elif response.status_code >= 500:
        raise Exception("Server error")
    else:
        raise Exception(f"Unexpected status: {response.status_code}")
```

### After (Complexity: 2)

```python
def process_api_response(response):
    """Process API response and handle various cases."""
    if not response.ok:
        raise create_error_from_status(response.status_code)

    data = response.json()
    return validate_response_data(data)

# Complexity: 2

STATUS_ERRORS = {
    404: "Resource not found",
    403: "Access denied",
    429: "Rate limit exceeded",
}

def create_error_from_status(status_code):
    """Create appropriate error based on status code."""
    if status_code in STATUS_ERRORS:
        return Exception(STATUS_ERRORS[status_code])

    if status_code >= 500:
        return Exception("Server error")

    return Exception(f"Unexpected status: {status_code}")

# Complexity: 2

def validate_response_data(data):
    """Validate response data structure."""
    if 'error' in data:
        raise Exception(data['error'])

    if 'result' not in data:
        raise Exception("Missing result field")

    if 'id' not in data['result']:
        raise Exception("Missing result ID")

    return data['result']

# Complexity: 3
```

**Improvements:**
- Dictionary for status code mapping
- Separate concerns: HTTP errors vs data validation
- Guard clauses for validation

---

## Example 4: Configuration Processing

### Before (Complexity: 10)

```python
def load_config(env, region, debug):
    """Load configuration based on environment and region."""
    config = {}

    if env == 'production':
        config['db'] = 'prod-db.example.com'
        if region == 'us-east-1':
            config['api'] = 'https://api-east.example.com'
        elif region == 'us-west-2':
            config['api'] = 'https://api-west.example.com'
        elif region == 'eu-west-1':
            config['api'] = 'https://api-eu.example.com'
        else:
            raise ValueError(f"Unknown region: {region}")
    elif env == 'staging':
        config['db'] = 'staging-db.example.com'
        config['api'] = 'https://staging-api.example.com'
    elif env == 'development':
        config['db'] = 'localhost:5432'
        config['api'] = 'http://localhost:3000'
    else:
        raise ValueError(f"Unknown environment: {env}")

    if debug:
        config['log_level'] = 'DEBUG'
    else:
        config['log_level'] = 'INFO'

    return config
```

### After (Complexity: 2)

```python
CONFIG_TEMPLATES = {
    'production': {
        'db': 'prod-db.example.com',
        'api_regions': {
            'us-east-1': 'https://api-east.example.com',
            'us-west-2': 'https://api-west.example.com',
            'eu-west-1': 'https://api-eu.example.com',
        },
    },
    'staging': {
        'db': 'staging-db.example.com',
        'api': 'https://staging-api.example.com',
    },
    'development': {
        'db': 'localhost:5432',
        'api': 'http://localhost:3000',
    },
}

def load_config(env, region, debug):
    """Load configuration based on environment and region."""
    template = CONFIG_TEMPLATES.get(env)
    if not template:
        raise ValueError(f"Unknown environment: {env}")

    config = template.copy()

    if 'api_regions' in config:
        api = config['api_regions'].get(region)
        if not api:
            raise ValueError(f"Unknown region: {region}")
        config['api'] = api
        del config['api_regions']

    config['log_level'] = 'DEBUG' if debug else 'INFO'

    return config

# Complexity: 2
```

**Improvements:**
- Data-driven configuration (no conditionals)
- Easy to add new environments or regions
- Configuration in one place
- Simple ternary for debug flag

---

## Example 5: Class with Multiple Responsibilities

### Before (Complexity per method: 5-8)

```python
class AssetManager:
    def process(self, asset, action):
        if action == 'scan':
            if asset.type == 'domain':
                return self.scan_domain(asset)
            elif asset.type == 'ip':
                return self.scan_ip(asset)
        elif action == 'notify':
            if asset.priority == 'high':
                return self.send_urgent(asset)
            else:
                return self.send_normal(asset)
        elif action == 'export':
            if asset.format == 'json':
                return self.export_json(asset)
            elif asset.format == 'csv':
                return self.export_csv(asset)

    # ... many more methods
```

### After (Complexity: 1-2 per class)

```python
from abc import ABC, abstractmethod

class AssetAction(ABC):
    @abstractmethod
    def execute(self, asset):
        pass

class ScanAction(AssetAction):
    def execute(self, asset):
        scanners = {
            'domain': self.scan_domain,
            'ip': self.scan_ip,
        }
        scanner = scanners.get(asset.type)
        return scanner(asset) if scanner else None

# Complexity: 1

class NotifyAction(AssetAction):
    def execute(self, asset):
        if asset.priority == 'high':
            return self.send_urgent(asset)
        return self.send_normal(asset)

# Complexity: 1

class ExportAction(AssetAction):
    def execute(self, asset):
        exporters = {
            'json': self.export_json,
            'csv': self.export_csv,
        }
        exporter = exporters.get(asset.format)
        return exporter(asset) if exporter else None

# Complexity: 1

ACTION_REGISTRY = {
    'scan': ScanAction(),
    'notify': NotifyAction(),
    'export': ExportAction(),
}

class AssetManager:
    def process(self, asset, action_name):
        action = ACTION_REGISTRY.get(action_name)
        if not action:
            raise ValueError(f"Unknown action: {action_name}")
        return action.execute(asset)

# Complexity: 1
```

**Improvements:**
- Strategy pattern with ABC
- Each action is independently testable
- Easy to add new actions
- Single Responsibility Principle

---

## Key Takeaways

1. **Dictionary Dispatch**: Replace if/elif chains with dictionaries
2. **List Comprehension**: Use Python's functional features
3. **Guard Clauses**: Return early to reduce nesting
4. **Composable Validators**: Build complex validation from simple rules
5. **Data-Driven Config**: Eliminate conditionals with configuration dictionaries
6. **ABC/Strategy**: Use Python's OOP for polymorphism
