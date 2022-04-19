// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarProvider } from './SideBar';
import { SwiperPanel } from './swiperPanel';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	
	console.log('Congratulations, your extension "pychat" is now active!');

	let disposable = vscode.commands.registerCommand('pychat.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from pychat!');
	});

	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
	  vscode.window.registerWebviewViewProvider(
		"pychat-sidebar",
		sidebarProvider
	  )
	);

	context.subscriptions.push(disposable);
	context.subscriptions.push( vscode.commands.registerCommand('pychat.askQuestion', async () => {
		const ans = await vscode.window.showInformationMessage('Do you  want me to open Swiper Panel ? ', "Yes", "No");
		if(ans === "Yes")
			SwiperPanel.createOrShow(context.extensionUri);
		else{
				console.log("good")
			}
		
	})

	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
