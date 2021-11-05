import * as uuid from 'uuid';
import { commands, ExtensionContext, TextEditor, TextEditorEdit, workspace, window } from 'vscode';

type UUIDVersion = `v${1 | 3 | 4 | 5}`;

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
    const commandHandler = async (textEditor: TextEditor, _: TextEditorEdit) => {
        const uuidVersion = workspace.getConfiguration('vscodeUUID').get('UUIDVersion') as UUIDVersion;

        for (let selection of textEditor.selections) {
            const newUUID = await generateUUID(uuidVersion);
            if (newUUID == null) return;

            await textEditor.edit(edit => {
                selection.isEmpty ? edit.insert(selection.active, newUUID) :
                    edit.replace(selection, newUUID);
            });
        }
    };

    context.subscriptions.push(commands.registerTextEditorCommand(command, commandHandler));
}
