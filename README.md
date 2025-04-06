# Tabs Workspaces in Markdown

Use markdown files as workspaces: persist grouped tabs, history and bookmarks

## Dependencies

All the instructions assume Linux and Nix + direnv are installed.

## Development

Create native script entrypoint and native messaging host:

```sh
pnpm build:native:dev
pnpm build:native:host # requires jq
ln test_md_workspaces.json ~/.mozilla/native-messaging-hosts/
```

Specify default vault (folder with notes) for the dev mode

```sh
echo WXT_DEV_VAULT=/home/user/vault > .env.development.local
```

Start development server and a browser:

```sh
pnpm dev:firefox
```

## Building

Building native script

```sh
pnpm build:native
```

Building extension `.zip` file

```sh
pnpm zip:firefox
```

User has to change `.path` field in the host manifest manually so that it is the absolute path of the `script` file that was build in the first step. The resulting host manifest has to be placed to the `native-messaging-hosts` folder.

To install the resulting extension you have to use Firefox Developer Edition.
