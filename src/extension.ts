import * as uuid from 'uuid';
import { commands, ExtensionContext, TextEditor, workspace, window } from 'vscode';

type UUIDVersion = `v${1 | 3 | 4 | 5}`;
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

export function activate(context: ExtensionContext) {
    const command = 'vscodeUUID.generateUUID';

    // we can't use the provided TextEditorEdit as the new value is computed asynchronously.
    const commandHandler = async (textEditor: TextEditor) => {
        const configuration = workspace.getConfiguration('vscodeUUID');
        const uuidVersion = configuration.get('UUIDVersion') as UUIDVersion;
        const uuidCase = configuration.get('case') as UUIDCase;
        const multiCursorBehavior = configuration.get('multiCursorBehavior') as UUIDMultiCursorBehavior;

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
    };

    context.subscriptions.push(commands.registerTextEditorCommand(command, commandHandler));
}
