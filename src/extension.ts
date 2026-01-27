import * as uuid from "uuid";

import {
  commands,
  ExtensionContext,
  l10n,
  TextEditor,
  window,
  workspace,
} from "vscode";

import {
  defaultFormat,
  UUIDBaseVersion,
  UUIDCase,
  UUIDMultiCursorBehavior,
  UUIDv35Version,
  UUIDVersion
} from "./models.ts";

import { formatValue } from "./format.ts";

const namespaceIDs = [
  {
    label: "DNS",
    description: uuid.v5.DNS,
  },
  {
    label: "URL",
    description: uuid.v5.URL,
  },
  {
    label: "ISO OID",
    description: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  },
  {
    label: "X.500 DN",
    description: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
  }
]

function getUUIDv35Name() {
  return window.showInputBox({
    prompt: l10n.t("Enter a name value for the UUID"),
    placeHolder: l10n.t("Name value for the UUID"),
    validateInput(value: string) {
      if (value.length === 0) {
        return l10n.t("Please enter a value.");
      }
    },
  });
}

async function getUUIDv35Namespace() {
  const ret = await window.showQuickPick(
    [
      ...namespaceIDs.map(el => ({
        label: el.label,
        description: el.description
      })),
      {
        label: l10n.t("Custom ..."),
        description: l10n.t("Enter your own UUID namespace"),
      },
    ],
    {
      placeHolder: l10n.t("Namespace value for the UUID"),
      canPickMany: false,
    }
  );

  if (ret == null) return null;

  if (uuid.validate(ret.description)) return ret.description;

  return window.showInputBox({
    prompt: l10n.t("Enter a namespace for the UUID"),
    placeHolder: l10n.t("Namespace value for the UUID"),
    validateInput(value: string) {
      if (!uuid.validate(value)) {
        return l10n.t("Please enter a valid UUID.");
      }
    },
  });
}

async function getUUIDVersion() {
  const version = await window.showQuickPick(
    ["v1", "v3", "v4", "v5", "v6", "v7"].map((v, i) => ({
      label: v,
      description: [
        l10n.t("Generates node-and-timestamp-based (UUIDv1) UUIDs"),
        l10n.t("Generates namespace-and-name-based (MD5, UUIDv3) UUIDs"),
        l10n.t("Generates random (UUIDv4) UUIDs"),
        l10n.t("Generates namespace-and-name-based (SHA-1, UUIDv5) UUIDs"),
        l10n.t("Generates node-and-timestamp-based (UUIDv6) UUIDs"),
        l10n.t("Generates timestamp-and-randomness-based (UUIDv7) UUIDs"),
      ][i],
    })),
    {
      placeHolder: l10n.t("Type of UUID to generate"),
      canPickMany: false,
    }
  );

  return version?.label as UUIDVersion;
}

async function generateUUIDv35(version: UUIDv35Version) {
  const buf = new Uint8Array(16);
  const namespace = await getUUIDv35Namespace();
  if (namespace == null) return;

  const name = await getUUIDv35Name();
  if (name == null) return;

  return uuid[version](name, namespace, buf);
}

function generateBaseUUID(version: UUIDBaseVersion) {
  const buf = new Uint8Array(16);
  return (uuid[version] as (options: any, buf: Uint8Array) => Uint8Array)(undefined, buf);
}

async function getWellKnownUUID() {
  const value = await window.showQuickPick(
    [
      ...namespaceIDs.map(el => ({
        label: l10n.t("{0} namespace ID", el.label),
        description: el.description
      })),
      {
        label: l10n.t("Nil"),
        description: uuid.NIL,
      },
      {
        label: l10n.t("Max"),
        description: uuid.MAX
      },
    ],
    {
      placeHolder: l10n.t("Well-known UUID"),
      canPickMany: false,
    }
  );

  return value?.description;
}

async function edit(editor: TextEditor, value: string): Promise<void>;
async function edit(editor: TextEditor, value: string[]): Promise<void>;
async function edit(editor: TextEditor, value: () => Thenable<string | undefined>): Promise<void>;
async function edit(editor: TextEditor, value: string | string[] | (() => Thenable<string | undefined>)): Promise<void> {
  const len = editor.selections.length;

  if (typeof value === "string" || typeof value === "object") {
    await editor.edit(edit => {
      for (let i = 0; i < len; i++) {
        const selection = editor.selections[i];
        const v = (typeof value === "string") ? value : value[i];

        if (selection.isEmpty) {
          edit.insert(selection.active, v);
        } else {
          edit.replace(selection, v);
        }
      }
    });
  } else {
    for (let i = 0; i < len; i++) {
      const selection = editor.selections[i];
      const v = await value();
      if (v == null) return;

      if (selection.isEmpty) {
        await editor.edit(edit => edit.insert(selection.active, v));
      } else {
        await editor.edit(edit => edit.replace(selection, v));
      }
    }
  }
}

function getConfig() {
  const configuration = workspace.getConfiguration("vscode-uuid");
  return {
    multiCursorBehavior: configuration.get<UUIDMultiCursorBehavior>("multiCursorBehavior"),
    uuidCase: configuration.get<UUIDCase>("uuidCase")!,
    format: configuration.get<string>("format")!,
  };
}

function getString(value: string | Uint8Array, format: string, uuidCase: UUIDCase) {
  let ret: string;
  if (typeof value === "string") {
    if (format === defaultFormat) {
      return uuidCase === "upper" ? value.toUpperCase() : value;
    } else {
      return formatValue(uuid.parse(value), format, uuidCase);
    }
  } else if (format === defaultFormat) {
    const insert = uuid.stringify(value);
    return uuidCase === "upper" ? insert.toUpperCase() : insert;
  } else {
    return formatValue(value, format, uuidCase);
  }
}

function handleString(value: string): (editor: TextEditor) => Promise<void> {
  return async (editor: TextEditor) => {
    const config = getConfig();
    return await edit(editor, getString(value, config.format, config.uuidCase));
  };
}

function handleAsyncString(valueGetter: () => Promise<string | undefined>): (editor: TextEditor) => Promise<void> {
  return async (editor: TextEditor) => {
    const config = getConfig();

    const value = await valueGetter();
    if (value == null) return;

    return await edit(editor, getString(value, config.format, config.uuidCase));
  };
}

function handle(versionGetter: () => Thenable<UUIDVersion | undefined>): (editor: TextEditor) => Promise<void> {
  return async (editor: TextEditor) => {
    const config = getConfig();

    const version = await versionGetter();
    if (version == null) return;

    if (version === "v3" || version === "v5") {
      await edit(editor, async () => {
        const value = await generateUUIDv35(version);
        if (value == null) return;

        return getString(value, config.format, config.uuidCase);
      });
    } else {
      const values: string[] = [];
      const len = editor.selections.length;
      for (let i = 0; i < len; i++) {
        const value = generateBaseUUID(version);
        values.push(getString(value, config.format, config.uuidCase));
      }

      await edit(editor, values);
    }
  };
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerTextEditorCommand(
      "vscode-uuid.generateUUID",
      handle(async () => {
        const configuration = workspace.getConfiguration("vscode-uuid");
        return configuration.get<UUIDVersion>("defaultVersion");
      })
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.generateUUIDWithVersion",
      handle(getUUIDVersion)
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertNilUUID",
      handleString(uuid.NIL)
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertMaxUUID",
      handleString(uuid.MAX)
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertWellKnownUUID",
      handleAsyncString(getWellKnownUUID)
    )
  );
}
