# HomeChief

HomeChief is a private family WeChat mini program for family life records and shared home recipes.

The first UI version includes:

- Family dynamic feed
- Recipe library and recipe detail
- Recipe creation with steps and photos
- Life/photo post creation
- Family album
- My/family settings overview

Open this project with WeChat DevTools and use `miniprogram/` as the mini program root.

## Local Verification

Run these checks from the mini program root:

```bash
cd miniprogram
node data/homechief.test.js
node tests/homechief-flows.test.js
```

The flow test covers page registration, JavaScript syntax, mock images, publish tab behavior, recipe creation, life post creation, recipe search/detail refresh, album filtering, and draft visibility.
