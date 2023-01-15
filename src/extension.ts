import * as uuid from 'uuid';
import { commands, ExtensionContext, TextEditor, workspace, window } from 'vscode';

enum UUIDVersion {
    v1 = "v1",
    v3 = "v3",
    v4 = "v4",
    v5 = "v5",
};

type UUIDCase = 'lower' | 'upper';
type UUIDMultiCursorBehavior = 'unique' | 'repeat';

function getUUIDv35Name() {
    return window.showInputBox({
        prompt: 'Enter a name value for the UUID',
        placeHolder: 'Name value for the UUID',
        validateInput(value: string) {
            if (value.length === 0) {
                return 'Please enter a value.'
            }
        }
    });
}

function getUUIDv35Namespace() {
    return window.showInputBox({
        prompt: 'Enter a namespace for the UUID',
        value: uuid.v4(),
        validateInput(value: string) {
            if (!uuid.validate(value)) {
                return 'Please enter a valid UUID.'
            }
        }
    });
}

function getUUIDVersion() {
    return window.showQuickPick(Object.values(UUIDVersion).map((v, i) => ({
        label: v,
        description: [
            "Generates MAC-address-and-timestamp- based (UUIDv1) UUIDs",
            "Generates namespace name-based (MD5, UUIDv3) UUIDs",
            "Generates random (UUIDv4) UUIDs",
            "Generates namespace name-based (SHA-1, UUIDv5) UUIDs"
        ][i]
    })), {
        placeHolder: 'Type of UUID to generate',
        canPickMany: false
    });
}

async function generateUUID(version: UUIDVersion) {
    if (version === 'v3' || version === 'v5') {
        const name = await getUUIDv35Name();
        if (name == null) return;

        const namespace = await getUUIDv35Namespace();
        if (namespace == null) return;

        return uuid[version](name, namespace);
    }

    return uuid[version]();
}

async function innerHandler(textEditor: TextEditor, uuidVersion: UUIDVersion, uuidCase: UUIDCase, multiCursorBehavior: UUIDMultiCursorBehavior) {
    let newUUID = await generateUUID(uuidVersion);
    for (const [index, selection] of textEditor.selections.entries()) {
        if (index > 0 && multiCursorBehavior == 'unique') {
            newUUID = await generateUUID(uuidVersion);
        }

        if (newUUID == null) return;

        if (uuidCase === 'upper') newUUID = newUUID.toUpperCase();

        await textEditor.edit(edit => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            selection.isEmpty ? edit.insert(selection.active, newUUID!) :
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                edit.replace(selection, newUUID!);
        });
    }
}

// we can't use the provided TextEditorEdit as the new value is computed asynchronously.
async function generateUUIDHandler(textEditor: TextEditor) {
    const configuration = workspace.getConfiguration('vscodeUUID');
    const uuidVersion = configuration.get('UUIDVersion') as UUIDVersion;
    const uuidCase = configuration.get('case') as UUIDCase;
    const multiCursorBehavior = configuration.get('multiCursorBehavior') as UUIDMultiCursorBehavior;

    await innerHandler(textEditor, uuidVersion, uuidCase, multiCursorBehavior);
}

// we can't use the provided TextEditorEdit as the new value is computed asynchronously.
async function generateUUIDWithVersionHandler(textEditor: TextEditor) {
    const configuration = workspace.getConfiguration('vscodeUUID');
    const uuidCase = configuration.get('case') as UUIDCase;
    const multiCursorBehavior = configuration.get('multiCursorBehavior') as UUIDMultiCursorBehavior;

    const uuidVersion = (await getUUIDVersion())?.label;
    if (uuidVersion == null) return;

    await innerHandler(textEditor, uuidVersion, uuidCase, multiCursorBehavior);
}

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerTextEditorCommand('vscodeUUID.generateUUID', generateUUIDHandler),
        commands.registerTextEditorCommand('vscodeUUID.generateUUIDWithVersion', generateUUIDWithVersionHandler));
}
