# Chariot Login Guide for Developers

## Quick Reference

- **Local Development:** https://localhost:3000
- **UAT Environment:** https://uat.chariot.praetorian.com
- **Production:** https://chariot.praetorian.com

## Understanding Backends

A backend is the server infrastructure that processes API requests, manages data, and handles authentication. The Chariot platform supports multiple backend environments:

- **Production:** Live customer environment (use with caution)
- **UAT:** User acceptance testing environment for staging features
- **Custom Stacks:** Personal development environments created via CloudFormation

## Local Development Setup

### Method 1: Keychain Files (Drag-and-Drop)

Keychain files allow you to quickly switch between backend environments by dragging them onto the login screen.

#### Production Backend
Save as `chariot-production.ini`:
```ini
[United States]
name = chariot
client_id = 795dnnr45so7m17cppta0b295o
api = https://d0qcl2e18h.execute-api.us-east-2.amazonaws.com/chariot
user_pool_id = us-east-2_BJ6QHVG2L
```

#### UAT Backend
Save as `chariot-uat.ini`:
```ini
[United States]
name = chariot-uat
client_id = 2fplckisph2hig8qeau3dv8njg
api = https://9s4tytykh5.execute-api.us-east-2.amazonaws.com/chariot-uat
user_pool_id = us-east-2_0SmsR1gQ9
```

#### Using Keychain Files
1. Save the appropriate `.ini` file
2. Navigate to https://localhost:3000
3. Drag the file onto the login form
4. Verify the stack name appears (e.g., "Stack: chariot-uat")
5. Sign in with Google or email/password

**Auto-Login Option:** You can add `username` and `password` fields to your keychain file for automatic login:
```ini
[United States]
name = chariot-uat
client_id = 2fplckisph2hig8qeau3dv8njg
api = https://9s4tytykh5.execute-api.us-east-2.amazonaws.com/chariot-uat
user_pool_id = us-east-2_0SmsR1gQ9
username = your-email@praetorian.com
password = your-password
```
When you drag this file onto the login screen, it will automatically populate and submit the login form.

### Method 2: Environment Files

Create environment files in `modules/chariot/ui/` for persistent backend configuration:

#### Production Environment
Create `.env` or `.env.production`:
```bash
VITE_BACKEND=chariot
VITE_API_URL=https://d0qcl2e18h.execute-api.us-east-2.amazonaws.com/chariot
VITE_CLIENT_ID=795dnnr45so7m17cppta0b295o
VITE_USER_POOL_ID=us-east-2_BJ6QHVG2L
```

#### UAT Environment
Create `.env.uat`:
```bash
VITE_BACKEND=chariot-uat
VITE_API_URL=https://9s4tytykh5.execute-api.us-east-2.amazonaws.com/chariot-uat
VITE_CLIENT_ID=2fplckisph2hig8qeau3dv8njg
VITE_USER_POOL_ID=us-east-2_0SmsR1gQ9
```

#### Custom Development Stack
Create `.env.[your-name]` (e.g., `.env.joseph`):
```bash
VITE_BACKEND=joseph
VITE_API_URL=https://your-api-id.execute-api.us-east-2.amazonaws.com/joseph
VITE_CLIENT_ID=your-client-id
VITE_USER_POOL_ID=your-user-pool-id
```

#### Starting with Environment Files
```bash
# Use production (default)
vite 

# Use UAT environment (.env.uat)
vite --mode uat

# Use custom environment (.env.joseph)
vite --mode joseph
```

## Creating Your Own Backend Stack

For personal development environments, see [../README.md](../README.md) for detailed instructions. Quick overview:

```bash
# From the repository root
make setup                    # Initial setup
make chariot                  # Deploy full stack
make user                     # Generate test credentials

# Your stack details will be in modules/chariot/backend/.env
# Use these values in your keychain file or environment configuration
```

## Authentication Methods

- **Google SSO:** Available for @praetorian.com accounts
- **Email/Password:** Standard authentication 
- **API Keys:** For programmatic access (see API documentation)

## Best Practices

1. **Use UAT or your personal stack for testing** - Prefer not to test features directly in production
2. **Name environment files clearly** - Use your name or feature (e.g., `.env.feature-xyz`)
3. **Keep credentials secure** - Never commit `.env` files or keychain files to git

## Additional Resources

- Full setup guide: [../README.md](../README.md)
- Backend deployment: `modules/chariot/backend/README.md`
- Frontend development: `modules/chariot/ui/README.md`
- API documentation: `modules/chariot/docs/API.md`
