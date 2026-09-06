# create-mugnavo

CLI for creating projects with Mugnavo templates.

```bash
pnpm create mugnavo
```

## Templates

- [`default`](https://github.com/mugnavo/tanstarter) - Minimal TanStarter template
- [`monorepo`](https://github.com/mugnavo/tanstarter-monorepo) - TanStarter Monorepo via pnpm workspaces

## Development

```bash
pnpm install
pnpm run ci
```

Releases are managed by Release Please. Use Conventional Commit messages: `fix:`
for patch releases, `feat:` for minor releases, and a `!` or `BREAKING CHANGE:`
footer for major releases. Do not update the package version manually.

## License

[MIT](./LICENSE)
