// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ProjectManager } from './ProjectManager';
import { SidebarProvider } from './SideBar';
import { SwiperPanel } from './swiperPanel';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	
	console.log('Congratulations, your extension "pychat" is now active!');

	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	item.text = "$(hubot) Git";
	item.command = 'pychat.openProjectManager';
	item.show();

	const sidebarProvider = new SidebarProvider(context.extensionUri, context);
	context.subscriptions.push(
	  vscode.window.registerWebviewViewProvider(
		"pychat-sidebar",
		sidebarProvider
	  )
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
		  "pychat.openProjectManager", async () =>{
			ProjectManager.createOrShow(context.extensionUri);
		  }
		)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
		  "pychat.refresh", async () =>{
			  	await vscode.commands.executeCommand("workbench.action.closeSidebar");
			  	await vscode.commands.executeCommand("workbench.view.extension.pychat-sidebar-view");
				// SwiperPanel.kill();
				// SwiperPanel.createOrShow(context.extensionUri);
		  }
		)
	  );

	let disposable = vscode.commands.registerCommand('pychat.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from pychat!');
	});
	context.subscriptions.push(disposable);

	
	context.subscriptions.push( vscode.commands.registerCommand('pychat.askQuestion', async () => {
			SwiperPanel.createOrShow(context.extensionUri);	
	})

	);
}

// this method is called when your extension is deactivated
export function deactivate() {}
