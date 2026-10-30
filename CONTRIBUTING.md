# Contributing

Bug reports and pull requests are welcome. For a bug, include the deployment mode
(`search`, `curated`, or `portal`), reproduction steps, and expected and actual
behavior. Use sample data and remove credentials from logs and screenshots.

Follow the [README quickstart](README.md#run-it-locally), create a branch for your
change, and keep each pull request focused. Explain the behavior it changes and
the checks you ran. Add or update tests when changing backend behavior,
especially authentication, organization isolation, catalog responses, or
migrations.

## Checks

For backend changes:

```bash
pip install -r requirements-dev.txt
./verify.sh
```

For frontend changes, use Node 22 and rebuild the affected app:

```bash
(cd admin && npm ci && npm run build)
(cd wizard && npm ci && npm run build)
```

The builds type-check the frontend and update the committed assets in
`app/static/`. Include the affected generated files with your source changes and
check the resulting page in a browser.

For changes to `docs/`:

```bash
pip install -r requirements-docs.txt
mkdocs build --strict
```

Include the regenerated `app/static/guide/` files. The original landing page is
edited directly as described in [its README](app/static/landing/README.md); the
multi-tenant demo landing page lives in `landing/multi-tenant/`.

## License

Contributions are made under the project's [GNU Affero General Public License,
version 3](LICENSE). Preserve existing third-party license and attribution
notices.
