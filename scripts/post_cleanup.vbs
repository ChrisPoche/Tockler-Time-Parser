Const forReading = 1
Const forWriting = 2

Dim folderName
folderName = ".\"

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

Dim fullpath
fullpath = fso.GetAbsolutePathName(folderName)

If fso.FileExists(folderName & "\build_details.json") Then 
    Wscript.Echo "WSI installer finished building."
    fso.DeleteFile(folderName & "\build_details.json")
    Wscript.Echo "build_details.json removed."
End If 
Set file = fso.OpenTextFile(folderName & "\src\index.html", forReading)
strText = file.ReadAll
file.Close
strNewText = Replace(strText, "app-min.js", "app.js")
Set file = fso.CreateTextFile(folderName & "\src\index.html", forWriting)
file.Write strNewText
file.Close
Wscript.Echo "index.html pointed back toward developer app.js."