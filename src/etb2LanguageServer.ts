import { createConnection, TextDocuments, ProposedFeatures, CompletionItem } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument/lib/umd/main';

const ETB2_COMMANDS = [
  'etb2',
  'etb2-subcommand1',
  'etb2-subcommand2',
  // Add more commands here as needed
];

export function createLanguageServer(subscriptions: { dispose(): void }) {
  const connection = createConnection(ProposedFeatures.all);
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

  documents.onDidChangeContent(change => {
    const document = change.document;
    connection.sendDiagnostics({
      uri: document.uri,
      diagnostics: [],
    });
  });

  connection.onCompletion(async (params) => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const lineStart = document.offsetAt({ line: params.position.line, character: 0 });
    const lineText = text.substring(lineStart, offset);

    // Provide completions only if the current line starts with "etb2"
    if (lineText.startsWith('etb2')) {
      const completions: CompletionItem[] = ETB2_COMMANDS.map(command => ({
        label: command,
        kind: 13, // CompletionItemKind.Method
      }));
      return completions;
    }

    return null;
  });

  documents.listen(connection);
  connection.listen();

  return connection;
}
