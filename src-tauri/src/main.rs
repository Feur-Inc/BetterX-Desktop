#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::fs;
use tauri::Manager;

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
     
      // Set the window title
      window.set_title("BetterX Desktop").unwrap();

      // Read the BetterX bundle
      let betterx_js = fs::read_to_string("./bundle.js").expect("Unable to read BetterX bundle");

      // Inject BetterX
      window.eval(&format!("
        {}
        console.log('BetterX injected successfully');
      ", betterx_js)).unwrap();

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}