!macro customInit
  # Check for VC++ Redistributable
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    MessageBox MB_YESNO "This application requires Visual C++ 2015-2019 Redistributable. Would you like to visit the download page now?" IDYES openDownloadPage IDNO endRedist
    openDownloadPage:
      ExecShell "open" "https://aka.ms/vs/16/release/vc_redist.x64.exe"
    endRedist:
  ${EndIf}
!macroend