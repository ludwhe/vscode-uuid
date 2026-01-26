import * as uuid from "uuid";
import {
  commands,
  ExtensionContext,
  l10n,
  TextEditor,
  window,
  workspace,
} from "vscode";

enum UUIDVersion {
  v1 = "v1",
  v3 = "v3",
  v4 = "v4",
  v5 = "v5",
  v6 = "v6",
  v7 = "v7"
}

type UUIDCase = "lower" | "upper";
type UUIDMultiCursorBehavior = "unique" | "repeat";

const defaultFormat = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
const formatSubstitution = /(?<!\\)x/g;

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

function getUUIDVersion() {
  return window.showQuickPick(
    Object.values(UUIDVersion).map((v, i) => ({
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
}

async function generateUUID(version: UUIDVersion) {
  if (version === "v3" || version === "v5") {
    const namespace = await getUUIDv35Namespace();
    if (namespace == null) return;

    const name = await getUUIDv35Name();
    if (name == null) return;

    return uuid[version](name, namespace);
  } else {
    return (uuid[version] as () => string)();
  }
}

async function getWellKnownUUID() {
  const value = await window.showQuickPick(
    [
      ...namespaceIDs.map(el => ({
        label: l10n.t('{0} namespace ID', el.label),
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

function formatValue(value: string, format: string) {
  let index = 0;
  const noHyphen = value.replaceAll("-", "");

  return format.replaceAll(formatSubstitution, s => {
    if (index >= noHyphen.length) return s;

    return noHyphen[index++];
  }).replaceAll(String.raw`\x`, "x")
}

function handler(getValue: () => Thenable<string | undefined>) {
  const configuration = workspace.getConfiguration("vscode-uuid");
  const multiCursorBehavior = configuration.get(
    "multiCursorBehavior"
  ) as UUIDMultiCursorBehavior;
  const uuidCase = configuration.get("uuidCase") as UUIDCase;
  const format = configuration.get("format") as string;

  return async (textEditor: TextEditor) => {
    let value = await getValue();

    if (value == null) return;

    for (const [index, selection] of textEditor.selections.entries()) {
      if (index > 0 && multiCursorBehavior == "unique") {
        value = await getValue();
      }

      if (value == null) return;

      if (uuidCase == "upper") {
        value = value.toUpperCase();
      }

      if (format != defaultFormat) {
        value = formatValue(value, format);
      }

      if (selection.isEmpty) {
        await textEditor.edit(edit => edit.insert(selection.active, value!));
      } else {
        await textEditor.edit(edit => edit.replace(selection, value!));
      }
    }
  };
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerTextEditorCommand(
      "vscode-uuid.generateUUID",
      handler(async () => {
        const configuration = workspace.getConfiguration("vscode-uuid");
        const uuidVersion = configuration.get("defaultVersion") as UUIDVersion;

        return await generateUUID(uuidVersion);
      })
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.generateUUIDWithVersion",
      handler(async () => {
        const uuidVersion = await getUUIDVersion();

        if (uuidVersion == null) return;

        return await generateUUID(uuidVersion.label);
      })
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertNilUUID",
      handler(() => Promise.resolve(uuid.NIL))
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertMaxUUID",
      handler(() => Promise.resolve(uuid.MAX))
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertWellKnownUUID",
      handler(getWellKnownUUID)
    )
  );
}
