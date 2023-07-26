import * as vscode from 'vscode';
import * as cp from 'child_process';


export class SampleKernel {
	private readonly _id = 'test-notebook-serializer-kernel';
	private readonly _label = 'ETB2 Kernel';
	private readonly _supportedLanguages = ['json'];

	private _executionOrder = 0;
	private readonly _controller: vscode.NotebookController;

	constructor() {
		this._controller = vscode.notebooks.createNotebookController(this._id,
			'etb2-notebook',
			this._label);
		
		this._controller.supportedLanguages = this._supportedLanguages;
		this._controller.supportsExecutionOrder = true;
		this._controller.executeHandler = this._executeAll.bind(this);
	}

	dispose(): void {
		this._controller.dispose();
	}

	private _executeAll(cells: vscode.NotebookCell[], _notebook: vscode.NotebookDocument, _controller: vscode.NotebookController): void {
		for (const cell of cells) {
			this._doExecution(cell);
		}
	}

	private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
		const execution = this._controller.createNotebookCellExecution(cell);

		if (cell.notebook.uri.toString().includes("untitled:")) {
			execution.executionOrder = ++this._executionOrder;
			execution.start(Date.now());
			try {
				execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text("Error: Please save the etb2 notebook first to specify the working directory. ")
				])]);
				execution.end(true, Date.now());
			} catch (err) {
				execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.error(err as Error)
				])]);
				execution.end(false, Date.now());
			}
		}
		
		else{
			execution.executionOrder = ++this._executionOrder;
			execution.start(Date.now());
			try {
				execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.text(executeETB2Command(cell.document.getText(), cell.notebook.uri.toString()))
				])]);
				execution.end(true, Date.now());
			} catch (err) {
				execution.replaceOutput([new vscode.NotebookCellOutput([
					vscode.NotebookCellOutputItem.error(err as Error)
				])]);
				execution.end(false, Date.now());
			}
		}

	}
}


function executeETB2Command(etb2Command: string, workingDirectory:string): string{
	
	// Example: file:///home/bouchekir/Desktop/vc-etb-user-test/certibus.sample-etb2-notebook
	const pathWithoutFilePrefix = workingDirectory.replace("file:///", "");
	const pathWithoutFinalPart = pathWithoutFilePrefix.replace(/\/[^/]*$/, "");
	vscode.window.showInformationMessage("I get:  "+pathWithoutFinalPart);
	const command = `/bin/bash -i -c "cd /${pathWithoutFinalPart} && ${etb2Command} 2>&1"`;

	  
	try {
	  //const result = cp.execSync('bash -i -c "'+etb2Command+'"', { stdio: 'pipe' }).toString().trim();
	  //const result = cp.execSync(etb2Command, { stdio: 'pipe', shell: '/bin/bash' }).toString().trim(); 
	  //const result = cp.execSync('/bin/bash -i -c "'+etb2Command+'"', { stdio: 'pipe' }).toString().trim();
	  //const result = cp.execSync('/bin/bash -i -c "' + etb2Command + ' 2>&1"', { stdio: 'pipe' }).toString().trim();
	  const result = cp.execSync(command, { stdio: 'pipe' }).toString().trim();
	  return result.trim();;
	} catch (error: any) {
		const errorMessage = (error.message as string)?.trim() || "Unknown Error";
		vscode.window.showInformationMessage('Error occurred:'+ error.message);
    	return "Error" + errorMessage;
	}
  }
