import * as uuid from "uuid";
import {
  commands,
  l10n,
  ExtensionContext,
  TextEditor,
  workspace,
  window,
  TextEditorEdit,
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

async function getUUIDv35Namespace(uuidCase: UUIDCase) {
  const ret = await window.showQuickPick(
    [
      ...namespaceIDs.map(el => ({
        label: el.label,
        description: (uuidCase === "upper") ? el.description.toUpperCase() : el.description
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

async function generateUUID(version: UUIDVersion, uuidCase: UUIDCase) {
  let ret: string;

  if (version === "v3" || version === "v5") {
    const namespace = await getUUIDv35Namespace(uuidCase);
    if (namespace == null) return;

    const name = await getUUIDv35Name();
    if (name == null) return;

    ret = uuid[version](name, namespace);
  } else {
    ret = (uuid[version] as () => string)();
  }

  return (uuidCase === "upper") ? ret.toUpperCase() : ret;
}

async function innerHandler(
  textEditor: TextEditor,
  uuidVersion: UUIDVersion,
  uuidCase: UUIDCase,
  multiCursorBehavior: UUIDMultiCursorBehavior
) {
  let newUUID = await generateUUID(uuidVersion, uuidCase);
  for (const [index, selection] of textEditor.selections.entries()) {
    if (index > 0 && multiCursorBehavior == "unique") {
      newUUID = await generateUUID(uuidVersion, uuidCase);
    }

    if (newUUID == null) return;

    await textEditor.edit((edit) => {
      selection.isEmpty
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          edit.insert(selection.active, newUUID!)
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          edit.replace(selection, newUUID!);
    });
  }
}

// we can't use the provided TextEditorEdit as the new value is computed asynchronously.
async function generateUUIDHandler(textEditor: TextEditor) {
  const configuration = workspace.getConfiguration("vscode-uuid");
  const uuidVersion = configuration.get("defaultVersion") as UUIDVersion;
  const uuidCase = configuration.get("case") as UUIDCase;
  const multiCursorBehavior = configuration.get(
    "multiCursorBehavior"
  ) as UUIDMultiCursorBehavior;

  await innerHandler(textEditor, uuidVersion, uuidCase, multiCursorBehavior);
}

// we can't use the provided TextEditorEdit as the new value is computed asynchronously.
async function generateUUIDWithVersionHandler(textEditor: TextEditor) {
  const configuration = workspace.getConfiguration("vscode-uuid");
  const uuidCase = configuration.get("case") as UUIDCase;
  const multiCursorBehavior = configuration.get(
    "multiCursorBehavior"
  ) as UUIDMultiCursorBehavior;

  const uuidVersion = (await getUUIDVersion())?.label;
  if (uuidVersion == null) return;

  await innerHandler(textEditor, uuidVersion, uuidCase, multiCursorBehavior);
}

function insertUUID(value: string) {
  const configuration = workspace.getConfiguration("vscode-uuid");
  const uuidCase = configuration.get("case") as UUIDCase;

  const toInsert = (uuidCase === "upper") ? value.toUpperCase() : value;

  return (textEditor: TextEditor, edit: TextEditorEdit) => {
    for (const selection of textEditor.selections) {
      if (selection.isEmpty) {
        edit.insert(selection.active, toInsert);
      } else {
        edit.replace(selection, toInsert);
      }
    }
  }
}

async function insertWellKnownUUID(textEditor: TextEditor) {
  const configuration = workspace.getConfiguration("vscode-uuid");
  const uuidCase = configuration.get("case") as UUIDCase;

  const value = await window.showQuickPick(
    [
      ...namespaceIDs.map(el => ({
        label: l10n.t('{0} namespace ID', el.label),
        description: (uuidCase === "upper") ? el.description.toUpperCase() : el.description
      })),
      {
        label: l10n.t("Nil"),
        description: uuid.NIL,
      },
      {
        label: l10n.t("Max"),
        description: (uuidCase === "upper") ? uuid.MAX.toUpperCase() : uuid.MAX,
      },
    ],
    {
      placeHolder: l10n.t("Well-known UUID"),
      canPickMany: false,
    }
  );

  if (value == null) return;

  const toInsert = (uuidCase === "upper") ? value.description.toUpperCase() : value.description;

  for (const selection of textEditor.selections) {
    await textEditor.edit((edit) => {
      selection.isEmpty
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          edit.insert(selection.active, toInsert!)
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          edit.replace(selection, toInsert!);
    });
  }
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerTextEditorCommand(
      "vscode-uuid.generateUUID",
      generateUUIDHandler
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.generateUUIDWithVersion",
      generateUUIDWithVersionHandler
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertNilUUID",
      insertUUID(uuid.NIL)
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertMaxUUID",
      insertUUID(uuid.MAX)
    ),
    commands.registerTextEditorCommand(
      "vscode-uuid.insertWellKnownUUID",
      insertWellKnownUUID
    )
  );
}
