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
      },
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
        l10n.t("Generates MAC-address-and-timestamp-based (UUIDv1) UUIDs"),
        l10n.t("Generates namespace-and-name-based (MD5, UUIDv3) UUIDs"),
        l10n.t("Generates random (UUIDv4) UUIDs"),
        l10n.t("Generates namespace-and-name-based (SHA-1, UUIDv5) UUIDs"),
        l10n.t("Generates MAC-address-and-timestamp-based (UUIDv6) UUIDs"),
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
  }

  return (uuid[version] as () => string)();
}

async function innerHandler(
  textEditor: TextEditor,
  uuidVersion: UUIDVersion,
  uuidCase: UUIDCase,
  multiCursorBehavior: UUIDMultiCursorBehavior
) {
  let newUUID = await generateUUID(uuidVersion);
  for (const [index, selection] of textEditor.selections.entries()) {
    if (index > 0 && multiCursorBehavior == "unique") {
      newUUID = await generateUUID(uuidVersion);
    }

    if (newUUID == null) return;

    if (uuidCase === "upper") newUUID = newUUID.toUpperCase();

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
  const configuration = workspace.getConfiguration("vscodeUUID");
  const uuidVersion = configuration.get("UUIDVersion") as UUIDVersion;
  const uuidCase = configuration.get("case") as UUIDCase;
  const multiCursorBehavior = configuration.get(
    "multiCursorBehavior"
  ) as UUIDMultiCursorBehavior;

  await innerHandler(textEditor, uuidVersion, uuidCase, multiCursorBehavior);
}

// we can't use the provided TextEditorEdit as the new value is computed asynchronously.
async function generateUUIDWithVersionHandler(textEditor: TextEditor) {
  const configuration = workspace.getConfiguration("vscodeUUID");
  const uuidCase = configuration.get("case") as UUIDCase;
  const multiCursorBehavior = configuration.get(
    "multiCursorBehavior"
  ) as UUIDMultiCursorBehavior;

  const uuidVersion = (await getUUIDVersion())?.label;
  if (uuidVersion == null) return;

  await innerHandler(textEditor, uuidVersion, uuidCase, multiCursorBehavior);
}

function generateNilUUID(textEditor: TextEditor, edit: TextEditorEdit) {
  for (const selection of textEditor.selections) {
    if (selection.isEmpty) {
      edit.insert(selection.active, uuid.NIL);
    } else {
      edit.replace(selection, uuid.NIL);
    }
  }
}

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerTextEditorCommand(
      "vscodeUUID.generateUUID",
      generateUUIDHandler
    ),
    commands.registerTextEditorCommand(
      "vscodeUUID.generateUUIDWithVersion",
      generateUUIDWithVersionHandler
    ),
    commands.registerTextEditorCommand(
      "vscodeUUID.generateNilUUID",
      generateNilUUID
    )
  );
}
