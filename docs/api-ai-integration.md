# API Request/Response Reference for Frontend (AI integration)

Purpose: provide concrete API URLs, request payloads and example responses so frontend engineers (or AI agents) can call the backend and get actual responses.

Replace `{{BASE_URL}}` with your runtime base URL (e.g. `https://api.example.com` or `http://localhost:3000`).

Auth

- Login
  - Method: POST
  - URL: {{BASE_URL}}/auth/login
  - Description: returns access token and refresh token
  - Request example:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

- Response example (200):

```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "r1x2y3...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "roles": ["user"]
  }
}
```

- Renew token
  - Method: POST
  - URL: {{BASE_URL}}/auth/renew
  - Request example:

```json
{
  "refreshToken": "r1x2y3..."
}
```

Products

- List products
  - Method: GET
  - URL: {{BASE_URL}}/products
  - Query params: `?q=search&limit=20&page=1&category=123`
  - Response example (200):

```json
{
  "items": [
    {
      "id": 101,
      "name": "Margherita Pizza",
      "price": 9.5,
      "available": true,
      "categoryId": 5
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 123 }
}
```

- Get product
  - Method: GET
  - URL: {{BASE_URL}}/products/:id
  - Example: `{{BASE_URL}}/products/101`
  - Response example (200):

```json
{
  "id": 101,
  "name": "Margherita Pizza",
  "description": "Tomato, mozzarella, basil",
  "price": 9.5,
  "images": ["/uploads/pizza1.jpg"]
}
```

Orders

- Create order
  - Method: POST
  - URL: {{BASE_URL}}/orders
  - Requires: Authorization header `Bearer <accessToken>`
  - Request example:

```json
{
  "customerId": 42,
  "items": [
    { "productId": 101, "quantity": 2 },
    { "productId": 205, "quantity": 1 }
  ],
  "deliveryAddress": "123 Main St",
  "branchId": 3
}
```

- Response example (201):

```json
{
  "id": 9001,
  "status": "pending",
  "total": 28.0,
  "createdAt": "2026-05-27T12:34:56.000Z"
}
```

- Get order
  - Method: GET
  - URL: {{BASE_URL}}/orders/:id
  - Example: `{{BASE_URL}}/orders/9001`
  - Response example (200):

```json
{
  "id": 9001,
  "status": "pending",
  "items": [
    { "productId": 101, "quantity": 2, "price": 9.5 },
    { "productId": 205, "quantity": 1, "price": 9.0 }
  ],
  "total": 28.0,
  "customer": { "id": 42, "name": "Alice" }
}
```

Other useful endpoints (examples)

- Categories: GET {{BASE_URL}}/categories
- Branches: GET {{BASE_URL}}/branches
- Inventory: GET {{BASE_URL}}/inventory?productId=101
- Reports: GET {{BASE_URL}}/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD

How to call (curl)

```
curl -X POST {{BASE_URL}}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'
```

Call with Authorization header (example)

```
curl {{BASE_URL}}/orders/9001 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

How to call (fetch JS)

```js
const base = process.env.API_BASE || window.location.origin;
const res = await fetch(`${base}/products`, { method: 'GET' });
const json = await res.json();
```

Notes and conventions

- Use standard HTTP status codes. Success: 200/201, Validation: 400, Auth: 401/403, Not found: 404.
- All JSON request bodies must set `Content-Type: application/json`.
- Protected endpoints require `Authorization: Bearer <accessToken>` header.
- If an endpoint accepts pagination, the response includes `meta` with `page`, `limit`, and `total`.

If you want, I can:

- expand this doc with every route in the project and actual example responses pulled from the running API (requires a base URL),
- or export this as JSON/Swagger snippets for the AI to call directly.

Real example responses (captured from running API at http://localhost:3000)

- Merchant products (GET /api/v1/merchant/products with header `x-merchant-id`):

```json
[
  {
    "id": "019bff40-1e12-46c4-b12d-119b0a430c45",
    "merchant_id": "0d9691f4-c993-4a94-8032-0e1e864ef9cf",
    "category_id": "5fc906ee-c1cb-4935-89b3-95ed24a3d745",
    "name": "Demo Product",
    "description": "This is a demo product",
    "base_price": 899,
    "image_url": "string",
    "track_inventory": false,
    "is_active": true,
    "created_at": "2026-05-26T18:49:02.902Z",
    "updated_at": "2026-05-26T18:49:02.902Z"
  }
]
```

- Merchant categories (GET /api/v1/merchant/categories with header `x-merchant-id`):

```json
[
  {
    "id": "5fc906ee-c1cb-4935-89b3-95ed24a3d745",
    "merchant_id": "0d9691f4-c993-4a94-8032-0e1e864ef9cf",
    "name": "Demo Category",
    "description": "This is a demo category",
    "is_available": true,
    "created_at": "2026-05-26T18:48:29.669Z"
  }
]
```

- Public product detail (GET /api/v1/products/:id):

```json
{
  "id": "019bff40-1e12-46c4-b12d-119b0a430c45",
  "merchant_id": "0d9691f4-c993-4a94-8032-0e1e864ef9cf",
  "category_id": "5fc906ee-c1cb-4935-89b3-95ed24a3d745",
  "name": "Demo Product",
  "description": "This is a demo product",
  "base_price": 899,
  "image_url": "string",
  "track_inventory": false,
  "is_active": true,
  "created_at": "2026-05-26T18:49:02.902Z",
  "updated_at": "2026-05-26T18:49:02.902Z",
  "category_name": "Demo Category"
}
```
