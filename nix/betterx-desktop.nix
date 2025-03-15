{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation rec {
  pname = "betterx-desktop";
  version = "2.0.1-beta";
  src = ../.;

  nativeBuildInputs = [ 
    pkgs.nodejs 
    pkgs.nodePackages.npm
    pkgs.electron
  ];

  buildInputs = [
    pkgs.makeWrapper
  ];

  buildPhase = ''
    export HOME=$PWD
    npm ci
    npm run build:linux
  '';

  installPhase = ''
    mkdir -p $out/bin $out/share/applications
    
    # Copy the built application
    cp -r dist/linux-unpacked/* $out/
    
    # Create a wrapper script
    makeWrapper $out/betterx-desktop $out/bin/betterx-desktop \
      --set ELECTRON_IS_DEV 0
    
    # Create desktop entry
    cat > $out/share/applications/betterx-desktop.desktop << EOF
    [Desktop Entry]
    Type=Application
    Name=BetterX Desktop
    Comment=Desktop application for BetterX, enhancing your browsing experience
    Exec=$out/bin/betterx-desktop
    Icon=$out/resources/icon.png
    Categories=Network;WebBrowser;
    Terminal=false
    EOF
  '';

  meta = with pkgs.lib; {
    description = "BetterX Desktop application enhancing your browsing experience";
    homepage = "https://github.com/Feur-Inc/BetterX-Desktop";
    license = licenses.gpl3Plus;
    maintainers = [ maintainers.mopigames ];
    platforms = platforms.linux;
  };
}
