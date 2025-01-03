# UUID Generator

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md) [![CI](https://github.com/ludwhe/vscode-uuid/actions/workflows/ci.yml/badge.svg)](https://github.com/ludwhe/vscode-uuid/actions/workflows/ci.yml)

Generates UUIDs of any type supported by [uuidjs](https://github.com/uuidjs/uuid) (v1, v3, v4, v5, v6, v7) inside your editor.

## Features

- Supports desktop as well as Web Visual Studio Code ;
- Supports multi-cursor edition with a configurable behavior: either `unique` (generate a UUID for each cursor) or `repeat` (generate a UUID to repeat across cursors) ;
- Configurable casing (`lower` or `upper`) ;
- Three commands :
  - "Generate UUID" (according to configured user preferences) ;
  - "Generate UUID with version" (with a prompt for the version to generate) ;
  - "Insert Nil UUID" ;
  - "Insert Max UUID" ;
  - "Insert well-known UUID" (with a prompt for the well-known UUID to insert).
- Offers quick selection of reserved namespaces for v3 and v5 UUIDs.

## Usage

- Install the extension ;
- With one or more cursors active in a text document, open the command palette (`Ctrl-Shift-P` or `Cmd-Shift-P`) ;
- Type in any command name referenced above and hit enter.
