# Unit 4: Seed data, Postman and testing (Group C)

This folder contains the Unit 4 deliverables for Group C:

- `seed/seed.js`: creates a local development dataset with verified users and groups
- `docs/postman/ajo-api.postman_collection.json`: a shared Postman collection for API testing

## Seed script

Run the seed script locally:

```bash
npm install
npm run seed
```

The script intentionally refuses to run in production mode:

```bash
NODE_ENV=production npm run seed
```

## Postman collection

Import the collection from `docs/postman/ajo-api.postman_collection.json`.

Set the `baseUrl` variable to your app URL, for example:

```text
http://localhost:5000
```

The `Login` request stores the JWT token in the `token` variable automatically.

Example seed login values:

- `randomguy@example.com` / `Password123***`
- `johndoe@example.com` / `Password123***`
- `janedoe@example.com` / `Password123***`
