import * as vscode from 'vscode';
import * as cp from 'child_process';
import { TextDecoder, TextEncoder } from 'util';



const NOTEBOOK_TYPE = 'etb2-notebook';

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('etb2-vs-code.etb2', () => {
		if (isETB2Installed()) {
			vscode.window.showInformationMessage('ETB2 is installed!');
		  } else {
			vscode.window.showWarningMessage('ETB2 is not installed. Please install ETB2 to use this extension properly. Please refer to: https://github.com/SRI-CSL/ETB2');
		  }
	});


	let ws = vscode.commands.registerCommand('etb2-notebook', async function () {
		try {
		  const notebookData = new vscode.NotebookData([
			new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '', 'Batch'),
		  ]);
		  
		  
		  const notebook = await vscode.workspace.openNotebookDocument('etb2-notebook', notebookData);
		  await vscode.window.showNotebookDocument(notebook);
		} catch (error) {
		  console.error('Error creating notebook:', error);
		  vscode.window.showErrorMessage('Failed to create notebook. Check the extension logs for details.');
		}
	  });

	
	vscode.workspace.registerNotebookSerializer('etb2-notebook', new SampleSerializer(), { transientOutputs: true });

	

	context.subscriptions.push(disposable);
	context.subscriptions.push(ws, new Controller());
}


export function deactivate() {}


function isETB2Installed(): boolean {
	try {
	  cp.execSync('bash -i -c "etb2 --version"', { stdio: 'pipe' }).toString().trim();
	  return true;
	} catch (error) {
	  console.log(error);
	  return false;
	}
  }



  interface RawNotebook {
	cells: RawNotebookCell[];
  }
  
  interface RawNotebookCell {
	source: string[];
	cell_type: 'code';
  }
  
  class SampleSerializer implements vscode.NotebookSerializer {
	async deserializeNotebook(
	  content: Uint8Array,
	  _token: vscode.CancellationToken
	): Promise<vscode.NotebookData> {
	  var contents = new TextDecoder().decode(content);
  
	  let raw: RawNotebookCell[];
	  try {
		raw = (<RawNotebook>JSON.parse(contents)).cells;
	  } catch {
		raw = [];
	  }
  
	  const cells = raw.map(
		item =>
		  new vscode.NotebookCellData(
			item.cell_type === 'code'
			  ? vscode.NotebookCellKind.Code
			  : vscode.NotebookCellKind.Markup,
			item.source.join('\n'),
			item.cell_type === 'code' ? 'Batch' : 'markdown'
		  )
	  );
  
	  return new vscode.NotebookData(cells);
	}
  
	async serializeNotebook(
	  data: vscode.NotebookData,
	  _token: vscode.CancellationToken
	): Promise<Uint8Array> {
	  let contents: RawNotebookCell[] = [];
  
	  for (const cell of data.cells) {

	  }
  
	  return new TextEncoder().encode(JSON.stringify(contents));
	}
  }



  class Controller {
	

	readonly controllerId = 'etb2-notebook';
	readonly notebookType = 'my-notebook';
	readonly label = 'My Notebook';
	readonly supportedLanguages = ['python'];
  
	private readonly _controller: vscode.NotebookController;
	private _executionOrder = 0;
  
	constructor() {
	  this._controller = vscode.notebooks.createNotebookController(
		this.controllerId,
		this.notebookType,
		this.label
	  );
  
	  this._controller.supportedLanguages = this.supportedLanguages;
	  this._controller.supportsExecutionOrder = true;
	  this._controller.executeHandler = this._execute.bind(this);
	  
	}
  
	dispose(): void {
		this._controller.dispose();
	}

	private _execute(
		
	  cells: vscode.NotebookCell[],
	  _notebook: vscode.NotebookDocument,
	  _controller: vscode.NotebookController
	): void {
	  for (let cell of cells) {
		this._doExecution(cell);
	  }
	  
	}
  
	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
	  const execution = this._controller.createNotebookCellExecution(cell);
	  execution.executionOrder = ++this._executionOrder;
	  execution.start(Date.now()); // Keep track of elapsed time to execute cell.
		
	  vscode.window.showInformationMessage('_doExecution');
	  /* Do some execution here; not implemented */
  
	  execution.replaceOutput([
		new vscode.NotebookCellOutput([
		  vscode.NotebookCellOutputItem.text('Dummy output text!')
		])
	  ]);
	  execution.end(true, Date.now());
	}
  }
  