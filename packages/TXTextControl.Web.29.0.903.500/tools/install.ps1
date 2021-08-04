# Runs every time a package is installed in a project

param($installPath, $toolsPath, $package, $project)

# $installPath is the path to the folder where the package is installed.
# $toolsPath is the path to the tools directory in the folder where the package is installed.
# $package is a reference to the package object.
# $project is a reference to the project the package was installed to.

# Remove Controllers for other languages
$controllersFolder = $project.ProjectItems.Item("Controllers");
if ($project.Type -eq "VB.NET") {
	$controllersFolder.ProjectItems.Item("TXPrintController.cs").Delete();
	$controllersFolder.ProjectItems.Item("TXWebSocketController.cs").Delete();
} else {
	$controllersFolder.ProjectItems.Item("TXPrintController.vb").Delete();
	$controllersFolder.ProjectItems.Item("TXWebSocketController.vb").Delete();
}

$DTE.ItemOperations.Navigate("http://www.textcontrol.com/en_US/support/documentation/getting-started/html5-mvc/");
