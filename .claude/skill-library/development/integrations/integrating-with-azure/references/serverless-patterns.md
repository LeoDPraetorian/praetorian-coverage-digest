# Azure Serverless Architecture Patterns

Serverless patterns using Azure Functions, Logic Apps, Event Grid, and supporting services.

---

## Reference Architecture

```
Event Grid (Event Router)
    ↓
Azure Functions (Compute)
    ↓
Service Bus / Storage Queue (Message Queue)
    ↓
Cosmos DB (NoSQL Database)
    ↓
Azure Logic Apps (Workflow Orchestration)
```

---

## Azure Functions

### HTTP Trigger with Managed Identity

```python
import azure.functions as func
from azure.identity import ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
import os

app = func.FunctionApp()

@app.function_name(name="HttpTrigger")
@app.route(route="api/data", auth_level=func.AuthLevel.FUNCTION)
def main(req: func.HttpRequest) -> func.HttpResponse:
    # Use managed identity
    credential = ManagedIdentityCredential(
        client_id=os.environ["MANAGED_IDENTITY_CLIENT_ID"]
    )

    # Access Key Vault
    keyvault_client = SecretClient(
        vault_url=f"https://{os.environ['KEYVAULT_NAME']}.vault.azure.net",
        credential=credential
    )

    db_password = keyvault_client.get_secret("database-password").value

    return func.HttpResponse("Success", status_code=200)
```

### Timer Trigger

```python
@app.function_name(name="TimerTrigger")
@app.schedule(schedule="0 */5 * * * *", arg_name="timer")
def scheduled_job(timer: func.TimerRequest):
    # Runs every 5 minutes
    process_data()
```

### Event Grid Trigger

```python
@app.function_name(name="EventGridTrigger")
@app.event_grid_trigger(arg_name="event")
def process_event(event: func.EventGridEvent):
    event_data = event.get_json()
    subject = event.subject
    event_type = event.event_type

    # Process event
    if event_type == "Microsoft.Storage.BlobCreated":
        handle_blob_created(event_data)
```

---

## Event-Driven Architecture

### Event Grid + Functions

```bash
# Create Event Grid subscription
az eventgrid event-subscription create \
  --name blob-created-subscription \
  --source-resource-id /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/mystorage \
  --endpoint https://myfunctionapp.azurewebsites.net/api/EventGridTrigger \
  --endpoint-type azurefunction \
  --included-event-types Microsoft.Storage.BlobCreated
```

---

## Message Processing

### Service Bus + Functions

```python
@app.function_name(name="ServiceBusTrigger")
@app.service_bus_queue_trigger(
    arg_name="msg",
    queue_name="myqueue",
    connection="ServiceBusConnection"
)
def process_message(msg: func.ServiceBusMessage):
    message_body = msg.get_body().decode('utf-8')

    try:
        # Process message
        result = process_data(message_body)
        # Message auto-completed on success
    except Exception as e:
        # Message abandoned (returns to queue for retry)
        raise
```

---

## Related Documentation

- [SDK Patterns](sdk-patterns.md) - Service client usage in Functions
- [Authentication](authentication.md) - Managed identity in serverless
- [Monitoring](monitoring.md) - Application Insights for Functions
