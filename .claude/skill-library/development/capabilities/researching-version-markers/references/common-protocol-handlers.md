# Common Protocol Handlers

**Where to find protocol code by language - file patterns and search strategies.**

## C/C++ Protocols

### Common File Patterns

| Pattern       | Description                   | Examples                           |
| ------------- | ----------------------------- | ---------------------------------- |
| `protocol*.c` | Protocol implementation       | `protocol.c`, `protocol_classic.c` |
| `wire*.c`     | Wire format encoding/decoding | `wire.c`, `wire_protocol.c`        |
| `conn*.c`     | Connection handling           | `conn.c`, `connection.c`           |
| `handler*.c`  | Request handlers              | `handler.c`, `request_handler.c`   |
| `server*.c`   | Server main loop              | `server.c`, `server_main.c`        |
| `packet*.c`   | Packet construction           | `packet.c`, `packet_builder.c`     |

### Search Strategies

```bash
# Find protocol files
gh search code "handshake" --language=c --repo={owner}/{repo}
gh search code "wire format" --language=c --repo={owner}/{repo}
gh search code "protocol version" --language=c --repo={owner}/{repo}

# Common directories
gh api repos/{owner}/{repo}/contents/src/protocol
gh api repos/{owner}/{repo}/contents/sql  # MySQL
gh api repos/{owner}/{repo}/contents/src/backend/libpq  # PostgreSQL
```

### Examples

**MySQL:** `sql/protocol_classic.cc`, `sql/auth/`, `sql/sql_connect.cc`

**PostgreSQL:** `src/backend/libpq/pqformat.c`, `src/backend/libpq/be-secure.c`

**Memcached:** `protocol_binary.c`, `memcached.c`

---

## Go Protocols

### Common File Patterns

| Pattern        | Description             | Examples                             |
| -------------- | ----------------------- | ------------------------------------ |
| `protocol*.go` | Protocol implementation | `protocol.go`, `protocol_handler.go` |
| `wire*.go`     | Wire format             | `wire.go`, `wire_format.go`          |
| `handler*.go`  | Request handlers        | `handler.go`, `request.go`           |
| `conn*.go`     | Connection management   | `conn.go`, `connection.go`           |
| `server*.go`   | Server logic            | `server.go`, `tcp_server.go`         |
| `message*.go`  | Message types           | `message.go`, `messages.go`          |

### Search Strategies

```bash
# Find protocol files
gh search code "WriteMessage" --language=go --repo={owner}/{repo}
gh search code "ReadMessage" --language=go --repo={owner}/{repo}
gh search code "Handshake" --language=go --repo={owner}/{repo}

# Common directories
gh api repos/{owner}/{repo}/contents/pkg/protocol
gh api repos/{owner}/{repo}/contents/internal/server
```

### Examples

**NATS:** `server/client.go`, `server/parser.go`

**etcd:** `server/etcdserver/api/v3rpc/grpc.go`

**CockroachDB:** `pkg/sql/pgwire/conn.go`, `pkg/sql/pgwire/types.go`

---

## Rust Protocols

### Common File Patterns

| Pattern        | Description             | Examples                           |
| -------------- | ----------------------- | ---------------------------------- |
| `protocol*.rs` | Protocol implementation | `protocol.rs`, `protocol/mod.rs`   |
| `wire*.rs`     | Wire format             | `wire.rs`, `wire_format.rs`        |
| `conn*.rs`     | Connection              | `conn.rs`, `connection.rs`         |
| `handler*.rs`  | Handlers                | `handler.rs`, `request_handler.rs` |
| `server*.rs`   | Server                  | `server.rs`, `tcp_server.rs`       |
| `codec*.rs`    | Encoding/decoding       | `codec.rs`, `framing.rs`           |

### Search Strategies

```bash
# Find protocol files
gh search code "impl Protocol" --language=rust --repo={owner}/{repo}
gh search code "decode" --language=rust --repo={owner}/{repo}
gh search code "Handshake" --language=rust --repo={owner}/{repo}

# Common directories
gh api repos/{owner}/{repo}/contents/src/protocol
gh api repos/{owner}/{repo}/contents/src/server
```

### Examples

**TiKV:** `src/server/server.rs`, `src/server/transport.rs`

**Tokio-based servers:** `src/proto/mod.rs`, `src/codec/mod.rs`

---

## Python Protocols

### Common File Patterns

| Pattern        | Description             | Examples                           |
| -------------- | ----------------------- | ---------------------------------- |
| `protocol*.py` | Protocol implementation | `protocol.py`, `wire_protocol.py`  |
| `handler*.py`  | Request handlers        | `handler.py`, `request_handler.py` |
| `server*.py`   | Server implementation   | `server.py`, `tcp_server.py`       |
| `conn*.py`     | Connection              | `connection.py`, `conn.py`         |
| `packet*.py`   | Packet handling         | `packet.py`, `packets.py`          |

### Search Strategies

```bash
# Find protocol files
gh search code "class Protocol" --language=python --repo={owner}/{repo}
gh search code "def handle_" --language=python --repo={owner}/{repo}
gh search code "handshake" --language=python --repo={owner}/{repo}

# Common directories
gh api repos/{owner}/{repo}/contents/src/protocol
gh api repos/{owner}/{repo}/contents/server
```

### Examples

**Tornado:** `tornado/tcpserver.py`, `tornado/iostream.py`

**AsyncIO servers:** `server/protocol.py`, `server/handler.py`

---

## Protocol-Specific Patterns

### MySQL

**Key files:**

- `sql/protocol_classic.cc` - Wire protocol implementation
- `sql/auth/` - Authentication plugins
- `sql/sql_connect.cc` - Connection handling
- `sql/sql_parse.cc` - Command parsing

**Search patterns:**

```bash
gh search code "CLIENT_" --language=c++ --repo=mysql/mysql-server | head -20
gh search code "server_handshake" --repo=mysql/mysql-server
```

### PostgreSQL

**Key files:**

- `src/backend/libpq/pqformat.c` - Wire format
- `src/backend/libpq/be-secure.c` - SSL/TLS
- `src/backend/libpq/auth.c` - Authentication
- `src/backend/tcop/postgres.c` - Command processing

**Search patterns:**

```bash
gh search code "pq_sendint" --repo=postgres/postgres
gh search code "StartupMessage" --repo=postgres/postgres
```

### Redis

**Key files:**

- `server.c` - Main server loop
- `networking.c` - Client connection handling
- `protocol.c` (in older versions) - Protocol handling

**Search patterns:**

```bash
gh search code "readQueryFromClient" --repo=redis/redis
gh search code "protocolError" --repo=redis/redis
```

### MongoDB

**Key files:**

- `src/mongo/transport/` - Transport layer
- `src/mongo/rpc/` - RPC protocol
- `src/mongo/db/auth/` - Authentication

**Search patterns:**

```bash
gh search code "OpMsg" --language=cpp --repo=mongodb/mongo
gh search code "hello command" --repo=mongodb/mongo
```

---

## Directory Structure Patterns

### Monorepo Structures

**Pattern:** `{module}/src/{protocol|server|conn}/`

```bash
# Example: CockroachDB
pkg/sql/pgwire/          # PostgreSQL wire protocol
pkg/server/              # Server implementation
```

### Layered Architecture

**Pattern:** Multiple protocol layers

```bash
# Example: PostgreSQL
src/backend/libpq/       # Protocol layer
src/backend/tcop/        # Traffic cop (command dispatcher)
src/backend/commands/    # Command implementations
```

### Language-Specific Conventions

**Go:** `pkg/protocol/`, `internal/server/`

**Rust:** `src/protocol/mod.rs`, `src/server/mod.rs`

**Python:** `{package}/protocol.py`, `{package}/server/`

**C/C++:** `src/protocol/`, `sql/protocol_classic.cc`

---

## Search Tips

### By Function Signature

```bash
# C/C++
gh search code "send_handshake" --language=c
gh search code "read_packet" --language=c

# Go
gh search code "func (.*) Handshake" --language=go

# Rust
gh search code "fn handshake" --language=rust

# Python
gh search code "def handshake" --language=python
```

### By String Literals

```bash
# Protocol version strings
gh search code '"Protocol version"' --repo={owner}/{repo}

# Error messages
gh search code '"Invalid protocol"' --repo={owner}/{repo}

# Capability names
gh search code '"CLIENT_"' --repo={owner}/{repo}
```

### By Comments

```bash
# Wire format documentation
gh search code "// Wire format:" --repo={owner}/{repo}
gh search code "/* Protocol:" --repo={owner}/{repo}

# Capability flags
gh search code "// Capability:" --repo={owner}/{repo}
```

---

## File Rename Detection

Protocol files may be renamed between versions:

```bash
# Find file history
gh api repos/{owner}/{repo}/commits?path={file}&per_page=100 | jq -r '.[].sha'

# Check for renames in a commit
git log --follow --oneline -- {file}
```

---

## Common Pitfalls

| Issue                       | Solution                                                                      |
| --------------------------- | ----------------------------------------------------------------------------- |
| Multiple protocol files     | Start with highest-level (e.g., `protocol_classic.cc` not `protocol_base.cc`) |
| Protocol abstraction layers | Look for concrete implementations, not interfaces                             |
| Generated code              | Find source templates, not generated output                                   |
| Test files                  | Filter out `*_test.{c,go,rs,py}`                                              |
| Protocol wrappers           | Find core protocol, not client libraries                                      |

---

## Quick Reference by Protocol

| Protocol    | Repository              | Key Files                                | Language |
| ----------- | ----------------------- | ---------------------------------------- | -------- |
| MySQL       | `mysql/mysql-server`    | `sql/protocol_classic.cc`, `sql/auth/`   | C++      |
| PostgreSQL  | `postgres/postgres`     | `src/backend/libpq/pqformat.c`           | C        |
| Redis       | `redis/redis`           | `server.c`, `networking.c`               | C        |
| MongoDB     | `mongodb/mongo`         | `src/mongo/rpc/`, `src/mongo/transport/` | C++      |
| Memcached   | `memcached/memcached`   | `protocol_binary.c`, `memcached.c`       | C        |
| etcd        | `etcd-io/etcd`          | `server/etcdserver/api/v3rpc/`           | Go       |
| CockroachDB | `cockroachdb/cockroach` | `pkg/sql/pgwire/`                        | Go       |
