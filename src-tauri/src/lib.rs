use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
struct OpenResult {
    path: String,
    data: String,
}

/// 保存画布。若未提供路径，弹出"另存为"对话框。
/// 返回最终保存的完整路径。
#[tauri::command]
fn save_scene(data: String, path: Option<String>) -> Result<String, String> {
    let p: PathBuf = match path {
        Some(p) if !p.trim().is_empty() => PathBuf::from(p),
        _ => {
            let picked = rfd::FileDialog::new()
                .set_title("保存画布")
                .add_filter("Excalidraw 画布", &["excalidraw", "json"])
                .set_file_name("未命名画布.excalidraw")
                .save_file();
            match picked {
                Some(p) => p,
                None => return Err("已取消".into()),
            }
        }
    };

    std::fs::write(&p, data).map_err(|e| format!("写入失败: {e}"))?;
    Ok(p.to_string_lossy().into_owned())
}

/// 打开画布：弹出打开对话框并读取文件内容。
/// 用户取消时返回 null。
#[tauri::command]
fn open_scene() -> Result<Option<OpenResult>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("打开画布")
        .add_filter("Excalidraw 画布", &["excalidraw", "json"])
        .pick_file();

    let Some(p) = picked else {
        return Ok(None);
    };

    let data = std::fs::read_to_string(&p).map_err(|e| format!("读取失败: {e}"))?;
    Ok(Some(OpenResult {
        path: p.to_string_lossy().into_owned(),
        data,
    }))
}

/// 导出图片（PNG/WebP）到本地文件。用户取消时返回 null。
#[tauri::command]
fn export_image(
    bytes: Vec<u8>,
    default_name: String,
    ext: String,
) -> Result<Option<String>, String> {
    let ext_for_filter = ext.clone();
    let picked = rfd::FileDialog::new()
        .set_title("导出图片")
        .add_filter(&format!("{ext} 图片"), &[ext_for_filter.as_str()])
        .set_file_name(&default_name)
        .save_file();

    let Some(p) = picked else {
        return Ok(None);
    };

    std::fs::write(&p, bytes).map_err(|e| format!("写入失败: {e}"))?;
    Ok(Some(p.to_string_lossy().into_owned()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_scene, open_scene, export_image])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
