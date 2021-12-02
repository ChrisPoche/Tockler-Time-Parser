Const forReading = 1
Const forWriting = 2

Dim folderName
folderName = ".\"

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

Dim fullpath
fullpath = fso.GetAbsolutePathName(folderName)


Set file = fso.OpenTextFile(folderName & "\package.json", forReading)
strText = file.ReadAll
file.Close
strNewText = Replace(strText, Replace("'main.js',", Chr(39), Chr(34)), Replace("'main.js',"& vbCrLf &"'type': 'module',", Chr(39), Chr(34)))
Set file = fso.CreateTextFile(folderName & "\build_details.json", forWriting)
file.WriteLine strNewText
file.Close