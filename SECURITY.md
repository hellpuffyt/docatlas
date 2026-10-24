# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's advisory form:
https://github.com/hellpuffyt/docatlas/security/advisories/new

Do not open a public issue for a suspected vulnerability.

## Scope

docatlas treats the markdown it builds and the `--source` tree it includes from
as trusted input written by the project's own authors. In scope:

- a broken internal link or anchor that passes `docatlas build`/`check`, or a
  built page whose links do not resolve;
- `docatlas serve` reading files outside the directory it serves, or being
  crashed by a request;
- an `include=` reading outside `--source`.

`docatlas serve` is a local preview server bound to `127.0.0.1`; publish the
built static files with a real web server.

## Supported versions

Only the latest commit on `main` is supported.
