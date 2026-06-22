# Part 4 - Token-Based Sign-In MVP

## Objective

Require login before board access using dummy credentials (`user` / `password`) with token-based auth and logout support.

## Checklist

- [x] Add login UI route and form in frontend.
- [x] Add backend auth endpoint to validate dummy credentials.
- [x] Issue a signed or opaque token from backend on successful login.
- [x] Store token client-side using a secure MVP strategy.
- [x] Protect board route so unauthenticated users are redirected to login.
- [x] Add logout flow that clears token and invalidates access.

## Tests

- [x] Backend pytest: auth endpoint accepts only expected dummy credentials.
- [x] Backend pytest: invalid credentials return unauthorized response.
- [x] Frontend unit test: login form validation and submit behavior.
- [x] Playwright: unauthenticated visit to `/` routes to login.
- [x] Playwright: successful login reaches board.
- [x] Playwright: logout returns to login and blocks board access.

## Success Criteria

- Board is inaccessible without a valid token.
- Login/logout behavior is deterministic and covered by tests.
- MVP credential behavior is explicit and documented.

## Out of Scope

- Multi-user registration, password reset, and full identity provider integration.