Const forReading = 1
Const forWriting = 2

Dim folderName
folderName = ".\"

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

Dim fullpath
fullpath = fso.GetAbsolutePathName(folderName)

Set file = fso.OpenTextFile(folderName & "\src\index.html", forReading)
strText = file.ReadAll
strNewText = Replace(strText, "app.js", "app-min.js")
file.Close
Set file = fso.CreateTextFile(folderName & "\src\index.html", forWriting)
file.Write strNewText
file.Close
Wscript.Echo "index.html pointed toward minified app-min.js."