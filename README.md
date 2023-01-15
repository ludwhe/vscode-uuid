# UUID Generator

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md) [![CI](https://github.com/ludwhe/vscode-uuid/actions/workflows/ci.yml/badge.svg)](https://github.com/ludwhe/vscode-uuid/actions/workflows/ci.yml)

Generates UUIDs of any type supported by [uuidjs](https://github.com/uuidjs/uuid) (v1, v3, v4, v5) inside your editor.

## Features

Generates UUIDs of any type supported by [uuidjs](https://github.com/uuidjs/uuid) (v1, v3, v4, v5) inside your editor.

- Supports "heavy" as well as Web Visual Studio Code ;
- Supports multi-cursor edition with a configurable behavior: either `unique` (generate a UUID for each cursor) or `repeat` (generate a UUID to repeat across cursors) ;
- Configurable casing (`lower` or `upper`) ;
- Two commands : "Generate UUID" (according to configured user preferences) or "Generate UUID with version" (with a prompt for the version to generate).


## Usage

- Install the extension ;
- With one or more cursors active in a text document, open the command palette (`Ctrl-Shift-P` or `Cmd-Shift-P`) ;
- Type "Generate UUID" or "Generate UUID with version" and hit enter.
