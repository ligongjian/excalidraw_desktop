use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize)]
struct OpenResult {
    path: String,
    data: String,
}

/// 草稿文件路径：应用数据目录下的 draft.json
fn draft_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败: {e}"))?;
    Ok(dir.join("draft.json"))
}

/// 把自动保存的草稿写入磁盘（崩溃 / 误关后的恢复兜底）
#[tauri::command]
fn write_draft(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let p = draft_path(&app)?;
    std::fs::write(&p, data).map_err(|e| format!("写入草稿失败: {e}"))
}

/// 读取上次遗留的草稿，不存在时返回 null
#[tauri::command]
fn read_draft(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let p = draft_path(&app)?;
    match std::fs::read_to_string(&p) {
        Ok(s) => Ok(Some(s)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("读取草稿失败: {e}")),
    }
}

/// 清除草稿
#[tauri::command]
fn clear_draft(app: tauri::AppHandle) -> Result<(), String> {
    let p = draft_path(&app)?;
    if p.exists() {
        std::fs::remove_file(&p).map_err(|e| format!("清除草稿失败: {e}"))?;
    }
    Ok(())
}

/// 保存画布。若未提供路径，弹出"另存为"对话框。
/// 返回最终保存的完整路径；用户在对话框中取消时返回 null（非错误）。
#[tauri::command]
fn save_scene(data: String, path: Option<String>) -> Result<Option<String>, String> {
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
                None => return Ok(None), // 用户取消，非错误
            }
        }
    };

    std::fs::write(&p, data).map_err(|e| format!("写入失败: {e}"))?;
    Ok(Some(p.to_string_lossy().into_owned()))
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

/// 返回应用数据目录（草稿 / 数据保存位置），供"关于"对话框展示
#[tauri::command]
fn data_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {e}"))?;
    Ok(dir.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_scene,
            open_scene,
            export_image,
            write_draft,
            read_draft,
            clear_draft,
            data_dir
        ])
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
