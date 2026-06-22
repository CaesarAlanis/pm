# Part 8 - OpenRouter Connectivity

## Objective

Add backend integration to call OpenRouter using model `openai/gpt-oss-120b` and prove connectivity.

## Checklist

- [ ] Add backend AI service module with OpenRouter client logic.
- [ ] Load `OPENROUTER_API_KEY` from environment.
- [ ] Add minimal backend route or test hook to perform prompt call.
- [ ] Implement timeout and error mapping for failed AI calls.
- [ ] Add logs that are safe and do not leak secrets.

## Tests

- [ ] pytest unit test for AI service with mocked OpenRouter response.
- [ ] Integration smoke test (manual or scripted) for prompt `2+2` with valid API key.
- [ ] Integration negative test verifies graceful behavior when key is missing.

## Success Criteria

- Backend can successfully call OpenRouter and return model output.
- Connectivity is proven with `2+2` test.

## Out of Scope

- Applying AI output to board state.