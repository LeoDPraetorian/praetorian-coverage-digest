# Request Clustering

Deep dive into HTTP request deduplication (Nuclei pattern).

## Signature Computation

```go
func computeSignature(req *http.Request) string {
    h := sha256.New()
    h.Write([]byte(req.Method))
    h.Write([]byte(req.URL.String()))

    // Include headers that affect response
    for _, key := range []string{"Authorization", "Content-Type"} {
        h.Write([]byte(req.Header.Get(key)))
    }

    return hex.EncodeToString(h.Sum(nil))
}
```

## Broadcast Pattern

```go
type Cluster struct {
    signature  string
    waiters    []chan<- *Response
}

func (c *Cluster) Execute() {
    resp := doRequest(c.signature)
    for _, ch := range c.waiters {
        ch <- resp  // Broadcast to all
    }
}
```

## Nuclei Use Case

- 100+ templates checking same endpoints
- Without clustering: 100 identical requests
- With clustering: 1 request, 100 broadcasts

**Content to be expanded with Nuclei architecture analysis.**
