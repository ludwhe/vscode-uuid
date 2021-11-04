import { commands, ExtensionContext, TextEditor, TextEditorEdit, Selection } from 'vscode';
import { v4 as uuidv4 } from 'uuid';

export function activate(context: ExtensionContext) {
    const command = 'vscodeUUID.generateUUID';

    const commandHandler = (textEditor: TextEditor, edit: TextEditorEdit) => {
        textEditor.selections.forEach(selection => {
            const cb = selection.isEmpty ? (s: Selection, v: string) => edit.insert(s.active, v) :
                (s: Selection, v: string) => edit.replace(s, v)

            cb(selection, uuidv4());
        });
    };

    context.subscriptions.push(commands.registerTextEditorCommand(command, commandHandler));
}
