Dim folderName
folderName = "..\Time Parser"

Dim fso
Set fso = CreateObject("Scripting.FileSystemObject")

Dim fullpath
fullpath = fso.GetAbsolutePathName(folderName) & "\Time Parser-win32-ia32\resources\app"
srcpath = fullpath & "\src"
scriptspath = fullpath & "\scripts"

For Each file In fso.GetFolder(fullpath).Files 
    If file.Name = "build_installer.js" OR file.Name = ".gitignore" Then
        fso.DeleteFile(fullpath & "\" & file.Name)
    End If
Next
fso.DeleteFolder(scriptspath)
Wscript.Echo "Successfully removed script files from build package."
If fso.FileExists(srcpath & "\app.js") Then
    fso.DeleteFile(srcpath & "\app.js")
    End If
Wscript.Echo "Successfully removed app.js build package."